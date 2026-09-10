const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema({ t: Number, p: Number }, { _id: false });

const stockSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    sector: { type: String, required: true },
    price: { type: Number, required: true },
    prevClose: { type: Number, required: true },
    // Rolling window only — enough for the intraday sparkline. Long-term
    // history lives in the Candle collection instead of growing this
    // document without bound (see models/Candle.js and lib/market.js).
    history: { type: [pointSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stock", stockSchema);
