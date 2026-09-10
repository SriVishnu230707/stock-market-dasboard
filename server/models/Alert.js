const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    symbol: { type: String, required: true, uppercase: true },
    direction: { type: String, enum: ["above", "below"], required: true },
    target: { type: Number, required: true },
    status: { type: String, enum: ["active", "triggered"], default: "active", index: true },
    triggeredAt: { type: Date },
    triggeredPrice: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", alertSchema);
