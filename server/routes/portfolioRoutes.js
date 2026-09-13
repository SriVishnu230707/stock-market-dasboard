const express = require("express");
const Portfolio = require("../models/Portfolio");
const priceCache = require("../lib/priceCache");
const { requireAuth } = require("../lib/auth");

const router = express.Router();

function normalizeSymbol(symbol = "") {
  return String(symbol || "")
    .trim()
    .toUpperCase();
}

function round2(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

function syntheticPriceFromAverage(symbol, avgPrice) {
  const hash = [...String(symbol || "")].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const drift = Math.sin(Date.now() / 10000 + hash) * 0.01;
  return round2(avgPrice * (1 + drift));
}

async function getOrCreate(userId) {
  let p = await Portfolio.findOne({ user: userId });
  if (!p) p = await Portfolio.create({ user: userId });
  return p;
}

function withPnL(portfolio) {
  const holdings = portfolio.holdings.map((h) => {
    const normalized = normalizeSymbol(h.symbol);
    const live = priceCache.get(normalized);
    const price = live
      ? live.price
      : syntheticPriceFromAverage(normalized, h.avgPrice || h.price || 0);
    const invested = round2(h.qty * h.avgPrice);
    const current = round2(h.qty * price);
    const pl = round2(current - invested);
    return {
      symbol: h.symbol,
      qty: h.qty,
      avgPrice: round2(h.avgPrice),
      price: round2(price),
      invested,
      current,
      pl,
      plPct: invested ? round2((pl / invested) * 100) : 0,
    };
  });

  const totalInvested = round2(holdings.reduce((a, h) => a + h.invested, 0));
  const totalCurrent = round2(holdings.reduce((a, h) => a + h.current, 0));
  const totalPl = round2(totalCurrent - totalInvested);

  return {
    cash: round2(portfolio.cash),
    holdings,
    totals: {
      invested: totalInvested,
      current: totalCurrent,
      pl: totalPl,
      plPct: totalInvested ? round2((totalPl / totalInvested) * 100) : 0,
    },
    transactions: (portfolio.transactions || []).slice(0, 50).map((t) => ({
      symbol: t.symbol,
      side: t.side,
      qty: t.qty,
      price: round2(t.price),
      total: round2(t.qty * t.price),
      at: t.at,
    })),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const p = await getOrCreate(req.user.sub);
  res.json(withPnL(p));
});

router.get("/transactions", requireAuth, async (req, res) => {
  const p = await getOrCreate(req.user.sub);
  res.json(p.transactions || []);
});

async function trade(req, res, side) {
  const { symbol, qty } = req.body || {};
  const sym = normalizeSymbol(symbol);
  const quantity = Math.floor(Number(qty));

  const live = priceCache.get(sym);
  if (!live) return res.status(404).json({ error: "Unknown stock symbol" });
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "Quantity must be a positive whole number" });
  }

  const portfolio = await getOrCreate(req.user.sub);
  const price = round2(live.price);
  const cost = round2(quantity * price);

  const idx = portfolio.holdings.findIndex((h) => h.symbol === sym);

  if (side === "buy") {
    if (portfolio.cash < cost) {
      return res.status(400).json({
        error: `Insufficient balance (Need ₹${cost.toFixed(2)}, Available: ₹${portfolio.cash.toFixed(2)})`,
      });
    }
    portfolio.cash = round2(portfolio.cash - cost);
    if (idx === -1) {
      portfolio.holdings.push({ symbol: sym, qty: quantity, avgPrice: price });
    } else {
      const h = portfolio.holdings[idx];
      const newQty = h.qty + quantity;
      h.avgPrice = round2((h.qty * h.avgPrice + quantity * price) / newQty);
      h.qty = newQty;
    }
  } else {
    if (idx === -1 || portfolio.holdings[idx].qty < quantity) {
      const available = idx === -1 ? 0 : portfolio.holdings[idx].qty;
      return res.status(400).json({
        error: `Not enough shares to sell (Requested ${quantity}, Available: ${available})`,
      });
    }
    portfolio.cash = round2(portfolio.cash + cost);
    portfolio.holdings[idx].qty -= quantity;
    if (portfolio.holdings[idx].qty === 0) portfolio.holdings.splice(idx, 1);
  }

  portfolio.transactions.unshift({
    symbol: sym,
    side,
    qty: quantity,
    price,
    at: new Date(),
  });
  portfolio.transactions = portfolio.transactions.slice(0, 50);
  await portfolio.save();

  res.json(withPnL(portfolio));
}

router.post("/buy", requireAuth, (req, res) => trade(req, res, "buy"));
router.post("/sell", requireAuth, (req, res) => trade(req, res, "sell"));

module.exports = router;
