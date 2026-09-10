const mongoose = require("mongoose");

const holdingSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, uppercase: true },
    qty: { type: Number, required: true, default: 0 },
    avgPrice: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    symbol: String,
    side: { type: String, enum: ["buy", "sell"] },
    qty: Number,
    price: Number,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const STARTING_CASH = 1000000; // ₹10,00,000 paper-trading balance

const portfolioSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    cash: { type: Number, default: STARTING_CASH },
    holdings: { type: [holdingSchema], default: [] },
    transactions: { type: [transactionSchema], default: [] },
  },
  { timestamps: true }
);

portfolioSchema.statics.STARTING_CASH = STARTING_CASH;

module.exports = mongoose.model("Portfolio", portfolioSchema);
