const mongoose = require("mongoose");

// One document per (symbol, minute). The market feed aggregates fast ticks
// in memory and flushes a candle here periodically instead of writing every
// single tick to Mongo — this is the "raw tick -> 1-min OHLCV -> long-term
// storage" pattern from the project write-up, and it's the main reason this
// app can handle a busy tick loop without hammering the database.
const candleSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, uppercase: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volumeTicks: { type: Number, default: 0 },
    bucketStart: { type: Date, required: true },
  },
  { timestamps: true }
);

candleSchema.index({ symbol: 1, bucketStart: 1 }, { unique: true });

module.exports = mongoose.model("Candle", candleSchema);
