const Stock = require("../models/Stock");
const Candle = require("../models/Candle");
const Alert = require("../models/Alert");
const priceCache = require("./priceCache");
const alertIndex = require("./alertIndex");

const TICK_MS = 1500;
const FLUSH_EVERY_N_TICKS = 20; // ~30s per candle at 1.5s ticks
const REST_SYNC_INTERVAL_MS = 30000; // 30s safe cadence for REST quotes (prevents 429 rate limit bans)
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote";

// candleBuf: symbol -> { open, high, low, close, volumeTicks, bucketStart }
const candleBuf = new Map();
const marketStatus = {
  provider: "simulated",
  source: "simulated",
  configured: false,
  usingFallback: true,
  lastSync: null,
};

const INDIAN_TICKERS = new Set([
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
  "BHARTIARTL",
  "ITC",
  "LT",
  "TATAMOTORS",
]);

function normalizeTickerForProvider(symbol = "", provider = "yahoo") {
  const normalized = String(symbol).trim().toUpperCase();
  if (!normalized) return "";
  if (normalized.includes(".") || normalized.includes("^")) return normalized;
  if (provider === "finnhub" || provider === "simulated") return normalized;
  // If explicitly an Indian stock symbol (like RELIANCE in tests/NSE), format with .NS
  if (INDIAN_TICKERS.has(normalized)) return `${normalized}.NS`;
  return normalized;
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
  const ticker = normalizeTickerForProvider(symbol, "yahoo");
  const url = `${YAHOO_CHART_URL}/${ticker}?interval=1m&range=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const quote = result.indicators?.quote?.[0];
  const closes = (quote?.close || []).filter((value) => Number.isFinite(value));
  const latest = closes.length
    ? Number(closes[closes.length - 1])
    : Number(result.meta?.regularMarketPrice);
  const prevClose = Number(
    result.meta?.previousClose ?? (closes.length > 1 ? closes[closes.length - 2] : latest)
  );
  if (!Number.isFinite(latest)) return null;

  return {
    symbol,
    price: Math.round(latest * 100) / 100,
    prevClose: Math.round(prevClose * 100) / 100,
  };
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

async function syncLiveQuotesOnce() {
  const { provider, apiKey, enabled } = resolveMarketDataConfig();
  if (!enabled || provider === "simulated") {
    setMarketStatus({
      provider: "simulated",
      source: "simulated",
      configured: false,
      usingFallback: true,
    });
    return [];
  }

  const symbols = priceCache.all().map((s) => s.symbol);
  try {
    // Process in small batches of 5 to avoid overwhelming network and stay well under rate limits
    const results = [];
    const BATCH_SIZE = 5;
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          try {
            if (provider === "finnhub") return await fetchFromFinnhub(symbol, apiKey);
            if (provider === "yahoo") return await fetchFromYahoo(symbol);
            return null;
          } catch (err) {
            return null;
          }
        })
      );
      results.push(...batchResults.filter(Boolean));
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    if (results.length > 0) {
      priceCache.applyLivePrices(results);
      setMarketStatus({
        provider,
        source: `${provider}-rest`,
        configured: true,
        usingFallback: false,
        lastSync: new Date().toISOString(),
      });
      console.log(`[market] Synced ${results.length} live quotes from ${provider}`);
      return results;
    }
  } catch (err) {
    console.warn(`[market] Live quote sync failed: ${err.message}`);
  }

  setMarketStatus({
    provider,
    source: "simulated",
    configured: enabled,
    usingFallback: true,
  });
  return [];
}

function initFinnhubWebSocket(apiKey) {
  if (!apiKey || typeof WebSocket === "undefined") return null;

  try {
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

    ws.onopen = () => {
      console.log("[market] Finnhub WebSocket connected");
      setMarketStatus({
        provider: "finnhub",
        source: "finnhub-ws",
        configured: true,
        usingFallback: false,
        lastSync: new Date().toISOString(),
      });

      // Subscribe to active stocks
      const symbols = priceCache.all().map((s) => s.symbol);
      for (const symbol of symbols) {
        ws.send(JSON.stringify({ type: "subscribe", symbol }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "trade" && Array.isArray(message.data)) {
          const updates = message.data.map((t) => ({
            symbol: t.s,
            price: t.p,
          }));
          priceCache.applyLivePrices(updates);
          marketStatus.lastSync = new Date().toISOString();
        }
      } catch {
        // Ignore parse error on heartbeats
      }
    };

    ws.onerror = (err) => {
      console.warn("[market] Finnhub WS error, will retry REST:", err?.message || "connection error");
    };

    ws.onclose = () => {
      console.log("[market] Finnhub WS closed, attempting reconnect in 10s...");
      setTimeout(() => initFinnhubWebSocket(apiKey), 10000);
    };

    return ws;
  } catch (err) {
    console.warn("[market] Could not initialize Finnhub WS:", err.message);
    return null;
  }
}

function setMarketStatus({ provider, source, configured, usingFallback, lastSync }) {
  marketStatus.provider = provider || "simulated";
  marketStatus.source = source || marketStatus.provider;
  marketStatus.configured = Boolean(configured);
  marketStatus.usingFallback = Boolean(usingFallback);
  if (lastSync) marketStatus.lastSync = lastSync;
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
  const config = resolveMarketDataConfig();

  // 1. Initial live sync or fallback
  if (config.enabled) {
    if (config.provider === "finnhub" && config.apiKey) {
      initFinnhubWebSocket(config.apiKey);
    }
    syncLiveQuotesOnce();

    // 2. Safe background sync cadence for REST (every 30s)
    setInterval(() => {
      syncLiveQuotesOnce();
    }, REST_SYNC_INTERVAL_MS);
  } else {
    setMarketStatus({
      provider: "simulated",
      source: "simulated",
      configured: false,
      usingFallback: true,
      lastSync: new Date().toISOString(),
    });
  }

  // 3. Non-overlapping tick loop at TICK_MS (1.5s)
  async function tick() {
    try {
      tickCount += 1;

      // Micro-tick local prices to keep real-time UI active
      priceCache.tickAll();
      const snapshot = priceCache.snapshot();

      // Emit to market room
      io.to("market").emit("tick", snapshot);
      io.to("market").emit("market-status", getMarketStatus());

      // Update candles and evaluate alerts
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

      // Periodic flush to MongoDB
      if (tickCount % FLUSH_EVERY_N_TICKS === 0) {
        await flushCandlesAndPrices();
      }
    } catch (err) {
      console.error("[market] tick error:", err.message);
    } finally {
      setTimeout(tick, TICK_MS);
    }
  }

  // Start tick loop
  setTimeout(tick, TICK_MS);
}

module.exports = {
  startMarketFeed,
  normalizeTickerForProvider,
  resolveMarketDataConfig,
  getMarketStatus,
};
