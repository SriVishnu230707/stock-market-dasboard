const Stock = require("../models/Stock");
const Candle = require("../models/Candle");
const Alert = require("../models/Alert");
const priceCache = require("./priceCache");
const alertIndex = require("./alertIndex");

const TICK_MS = 1500;
const FLUSH_EVERY_N_TICKS = 20; // ~30s per candle at 1.5s ticks
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote";

// candleBuf: symbol -> { open, high, low, close, volumeTicks, bucketStart }
const candleBuf = new Map();
const marketStatus = {
  provider: "simulated",
  source: "simulated",
  configured: false,
  usingFallback: true,
};

function normalizeTickerForProvider(symbol = "", provider = "yahoo") {
  const normalized = String(symbol).trim().toUpperCase();
  if (!normalized) return "";
  if (normalized.includes(".") || normalized.includes("^")) return normalized;
  if (provider === "finnhub" || provider === "simulated") return normalized;
  return `${normalized}.NS`;
}

function resolveMarketDataConfig(env = process.env) {
  const provider = (env.MARKET_DATA_PROVIDER || "simulated").toLowerCase();
  const apiKey = env.MARKET_DATA_API_KEY || "";

  return {
    provider,
    apiKey,
    enabled: provider === "finnhub" ? Boolean(apiKey) : provider === "yahoo",
  };
}

async function fetchFromYahoo(symbol) {
  const url = `${YAHOO_CHART_URL}/${normalizeTickerForProvider(symbol, "yahoo")}?interval=1m&range=1d`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const quote = result.indicators?.quote?.[0];
  const closes = (quote?.close || []).filter((value) => Number.isFinite(value));
  if (!closes.length) return null;

  const latest = Number(closes[closes.length - 1]);
  const prevClose = Number(result.meta?.previousClose ?? closes[closes.length - 2] ?? latest);
  if (!Number.isFinite(latest)) return null;

  return { symbol, price: latest, prevClose };
}

async function fetchFromFinnhub(symbol, apiKey) {
  if (!apiKey) return null;

  const url = new URL(FINNHUB_QUOTE_URL);
  url.searchParams.set("symbol", normalizeTickerForProvider(symbol, "finnhub"));
  url.searchParams.set("token", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  const price = Number(data?.c);
  const prevClose = Number(data?.pc);
  if (!Number.isFinite(price)) return null;

  return {
    symbol,
    price,
    prevClose: Number.isFinite(prevClose) ? prevClose : price,
  };
}

async function fetchLiveSnapshot() {
  const { provider, apiKey } = resolveMarketDataConfig();
  const symbols = priceCache.all().map((s) => s.symbol);
  const responses = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        if (provider === "finnhub") {
          return await fetchFromFinnhub(symbol, apiKey);
        }
        if (provider === "yahoo") {
          return await fetchFromYahoo(symbol);
        }
        return null;
      } catch (err) {
        console.warn(`[market] live fetch failed for ${symbol}:`, err.message);
        return null;
      }
    })
  );

  return responses.filter(Boolean);
}

function setMarketStatus({ provider, source, configured, usingFallback }) {
  marketStatus.provider = provider || "simulated";
  marketStatus.source = source || marketStatus.provider;
  marketStatus.configured = Boolean(configured);
  marketStatus.usingFallback = Boolean(usingFallback);
}

function getMarketStatus() {
  return { ...marketStatus };
}

function updateCandleBuffer(symbol, price) {
  const existing = candleBuf.get(symbol);
  if (!existing) {
    candleBuf.set(symbol, {
      open: price,
      high: price,
      low: price,
      close: price,
      volumeTicks: 1,
      bucketStart: new Date(),
    });
    return;
  }
  existing.high = Math.max(existing.high, price);
  existing.low = Math.min(existing.low, price);
  existing.close = price;
  existing.volumeTicks += 1;
}

async function flushCandlesAndPrices() {
  const ops = [];
  for (const [symbol, candle] of candleBuf.entries()) {
    ops.push(
      Candle.updateOne(
        { symbol, bucketStart: candle.bucketStart },
        { $set: candle },
        { upsert: true }
      )
    );
  }
  candleBuf.clear();

  // Persist current price/history snapshot too, so a server restart resumes
  // close to where prices left off instead of re-seeding from scratch.
  const stockOps = priceCache
    .all()
    .map((s) =>
      Stock.updateOne({ symbol: s.symbol }, { $set: { price: s.price, history: s.history } })
    );

  await Promise.all(
    [...ops, ...stockOps].map((p) => p.catch((e) => console.error("[flush]", e.message)))
  );
}

async function persistTriggeredAlert(entry, price) {
  try {
    await Alert.findByIdAndUpdate(entry.alertId, {
      status: "triggered",
      triggeredAt: new Date(),
      triggeredPrice: price,
    });
  } catch (e) {
    console.error("[alert persist]", e.message);
  }
}

function startMarketFeed(io) {
  let tickCount = 0;

  setInterval(async () => {
    let snapshot;
    let status = {
      provider: "simulated",
      source: "simulated",
      configured: false,
      usingFallback: true,
    };

    try {
      const config = resolveMarketDataConfig();
      const live = await fetchLiveSnapshot();
      if (live.length) {
        priceCache.applyLivePrices(live);
        status = {
          provider: config.provider,
          source: config.provider,
          configured: config.enabled,
          usingFallback: false,
        };
      } else {
        priceCache.tickAll();
        status = {
          provider: config.provider || "simulated",
          source: "simulated",
          configured: config.enabled,
          usingFallback: true,
        };
      }
      snapshot = priceCache.snapshot();
    } catch (err) {
      console.error("[market] live update failed, falling back to simulation", err.message);
      priceCache.tickAll();
      status = {
        provider: "simulated",
        source: "simulated",
        configured: false,
        usingFallback: true,
      };
      snapshot = priceCache.snapshot();
    }

    setMarketStatus(status);
    io.to("market").emit("tick", snapshot);
    io.to("market").emit("market-status", getMarketStatus());

    for (const s of snapshot) {
      updateCandleBuffer(s.symbol, s.price);
      const fired = alertIndex.evaluate(s.symbol, s.price);
      for (const entry of fired) {
        io.to(`user:${entry.userId}`).emit("alert-triggered", {
          alertId: entry.alertId,
          symbol: s.symbol,
          direction: entry.direction,
          target: entry.target,
          price: s.price,
        });
        persistTriggeredAlert(entry, s.price);
      }
    }

    if (tickCount % FLUSH_EVERY_N_TICKS === 0) {
      flushCandlesAndPrices();
    }
  }, TICK_MS);
}

module.exports = {
  startMarketFeed,
  normalizeTickerForProvider,
  resolveMarketDataConfig,
  getMarketStatus,
};
