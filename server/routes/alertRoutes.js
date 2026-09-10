const express = require("express");
const Alert = require("../models/Alert");
const priceCache = require("../lib/priceCache");
const alertIndex = require("../lib/alertIndex");
const { requireAuth } = require("../lib/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const list = await Alert.find({ user: req.user.sub }).sort({ createdAt: -1 });
  res.json(list);
});

router.post("/", requireAuth, async (req, res) => {
  const { symbol, direction, target } = req.body || {};
  const sym = (symbol || "").toUpperCase();

  if (!priceCache.get(sym)) return res.status(404).json({ error: "Unknown symbol" });
  if (!["above", "below"].includes(direction)) {
    return res.status(400).json({ error: "direction must be 'above' or 'below'" });
  }
  const targetNum = Number(target);
  if (
    target === "" ||
    target === undefined ||
    target === null ||
    !Number.isFinite(targetNum) ||
    targetNum <= 0
  ) {
    return res.status(400).json({ error: "target must be a positive number" });
  }

  const alert = await Alert.create({
    user: req.user.sub,
    symbol: sym,
    direction,
    target: targetNum,
  });

  // Register with the in-memory index so the tick loop starts watching it
  // on the very next tick, without needing a Mongo round trip.
  alertIndex.add(sym, alert._id.toString(), req.user.sub, direction, targetNum);

  res.status(201).json(alert);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const alert = await Alert.findOne({ _id: req.params.id, user: req.user.sub });
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  alertIndex.remove(alert.symbol, alert._id.toString());
  await alert.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
