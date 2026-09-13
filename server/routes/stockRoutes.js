const express = require("express");
const priceCache = require("../lib/priceCache");
const Candle = require("../models/Candle");
const { requireAuth } = require("../lib/auth");

const router = express.Router();

const RANGE_CONFIG = {
  "1d": { days: 1, sample: 1 },
  "1w": { days: 7, sample: 1 },
  "3m": { days: 90, sample: 1 },
  "6m": { days: 180, sample: 2 },
};

function buildSyntheticSeries(stock, rangeKey) {
  const points = rangeKey === "1w" ? 28 : rangeKey === "3m" ? 90 : 180;
  const now = Date.now();
  const start =
    now -
    (rangeKey === "1w"
      ? 7 * 24 * 60 * 60 * 1000
      : rangeKey === "3m"
        ? 90 * 24 * 60 * 60 * 1000
        : 180 * 24 * 60 * 60 * 1000);
  const baseline = Number(stock.price || 0);

  const series = [];
  for (let i = 0; i < points; i += 1) {
    const t = start + (i / Math.max(points - 1, 1)) * (now - start);
    const wave = Math.sin(i / 6) * (baseline * 0.018);
    const trend = (i / points) * (baseline * (rangeKey === "1w" ? 0.04 : 0.12));
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 2.3)) * baseline * 0.005 || 0;
    const price = Math.max(1, baseline + wave + trend + noise);
    series.push({
      label: new Date(t).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      price: Number(price.toFixed(2)),
    });
  }

  return series;
}

router.get("/", requireAuth, (req, res) => {
  res.json(priceCache.snapshot());
});

router.get("/:symbol/chart", requireAuth, async (req, res) => {
  const symbol = req.params.symbol?.toUpperCase();
  const stock = priceCache.get(symbol);
  if (!stock) return res.status(404).json({ error: "Unknown symbol" });

  const rangeKey = (req.query.range || "1d").toLowerCase();
  const history = Array.isArray(stock.history) ? stock.history : [];

  // 1D: Return intraday tick history with formatted time labels
  if (rangeKey === "1d") {
    if (history.length) {
      return res.json(
        history.map((point) => {
          const d = typeof point.t === "number" && point.t > 1000000 ? new Date(point.t) : new Date();
          return {
            label: d.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            }),
            price: Number((point.price ?? point.p ?? 0).toFixed(2)),
          };
        })
      );
    }
  }

  // 1W, 3M, 6M: Query real stored candles from MongoDB
  const rangeInfo = RANGE_CONFIG[rangeKey] || RANGE_CONFIG["1w"];
  const startTime = new Date(Date.now() - rangeInfo.days * 24 * 60 * 60 * 1000);

  try {
    const candles = await Candle.find({
      symbol,
      bucketStart: { $gte: startTime },
    })
      .sort({ bucketStart: 1 })
      .lean();

    if (candles && candles.length > 5) {
      return res.json(
        candles.map((c) => ({
          label: new Date(c.bucketStart).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          }),
          price: Number(c.close.toFixed(2)),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volumeTicks,
        }))
      );
    }
  } catch (err) {
    console.warn("[stock chart] candle fetch error:", err.message);
  }

  // Fallback if candles haven't accumulated yet
  const generated = buildSyntheticSeries(stock, rangeKey);
  return res.json(generated);
});

router.get("/:symbol", requireAuth, (req, res) => {
  const stock = priceCache.get(req.params.symbol);
  if (!stock) return res.status(404).json({ error: "Unknown symbol" });
  res.json(priceCache.snapshot().find((s) => s.symbol === stock.symbol));
});

module.exports = router;
