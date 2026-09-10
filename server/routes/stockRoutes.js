const express = require("express");
const priceCache = require("../lib/priceCache");
const { requireAuth } = require("../lib/auth");

const router = express.Router();

const RANGE_POINTS = {
  "1d": 24,
  "1w": 28,
  "3m": 90,
  "6m": 180,
};

function buildSyntheticSeries(stock, rangeKey) {
  const points = RANGE_POINTS[rangeKey] || RANGE_POINTS["1d"];
  const now = Date.now();
  const start =
    now -
    (rangeKey === "1d"
      ? 24 * 60 * 60 * 1000
      : rangeKey === "1w"
        ? 7 * 24 * 60 * 60 * 1000
        : rangeKey === "3m"
          ? 90 * 24 * 60 * 60 * 1000
          : 180 * 24 * 60 * 60 * 1000);
  const baseline = Number(stock.price || 0);

  const series = [];
  for (let i = 0; i < points; i += 1) {
    const t = start + (i / Math.max(points - 1, 1)) * (now - start);
    const wave = Math.sin(i / 6) * (baseline * 0.018);
    const trend =
      (i / points) *
      (baseline *
        (rangeKey === "1d" ? 0.02 : rangeKey === "1w" ? 0.045 : rangeKey === "3m" ? 0.12 : 0.2));
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 2.3)) * baseline * 0.0065 || 0;
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

router.get("/:symbol/chart", requireAuth, (req, res) => {
  const symbol = req.params.symbol?.toUpperCase();
  const stock = priceCache.get(symbol);
  if (!stock) return res.status(404).json({ error: "Unknown symbol" });

  const rangeKey = (req.query.range || "1d").toLowerCase();
  const history = Array.isArray(stock.history) ? stock.history : [];

  if (rangeKey === "1d" && history.length) {
    return res.json(
      history.map((point, index) => ({
        label: index % 6 === 0 ? `T${index}` : "",
        price: Number(point.price ?? point.p ?? 0),
      }))
    );
  }

  const generated = buildSyntheticSeries(stock, rangeKey);
  return res.json(generated);
});

router.get("/:symbol", requireAuth, (req, res) => {
  const stock = priceCache.get(req.params.symbol);
  if (!stock) return res.status(404).json({ error: "Unknown symbol" });
  res.json(priceCache.snapshot().find((s) => s.symbol === stock.symbol));
});

module.exports = router;
