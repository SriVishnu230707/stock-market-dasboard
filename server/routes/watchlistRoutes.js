const express = require("express");
const Watchlist = require("../models/Watchlist");
const priceCache = require("../lib/priceCache");
const { requireAuth } = require("../lib/auth");

const router = express.Router();

async function getOrCreate(userId) {
  let wl = await Watchlist.findOne({ user: userId });
  if (!wl) wl = await Watchlist.create({ user: userId, symbols: [] });
  return wl;
}

router.get("/", requireAuth, async (req, res) => {
  const wl = await getOrCreate(req.user.sub);
  res.json(wl.symbols);
});

router.post("/:symbol", requireAuth, async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!priceCache.get(symbol)) return res.status(404).json({ error: "Unknown symbol" });

  const wl = await getOrCreate(req.user.sub);
  if (!wl.symbols.includes(symbol)) {
    wl.symbols.push(symbol);
    await wl.save();
  }
  res.status(201).json(wl.symbols);
});

router.delete("/:symbol", requireAuth, async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const wl = await getOrCreate(req.user.sub);
  wl.symbols = wl.symbols.filter((s) => s !== symbol);
  await wl.save();
  res.json(wl.symbols);
});

module.exports = router;
