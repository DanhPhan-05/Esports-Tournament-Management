import mongoose from "mongoose";

const schema = new mongoose.Schema({
  category: { type: String, enum: ["Password", "Login", "Session", "RateLimit"], required: true },
  config: { type: mongoose.Schema.Types.Mixed, required: true },
  previousConfig: mongoose.Schema.Types.Mixed,
  version: { type: Number, required: true, min: 1 },
  isActive: { type: Boolean, default: true },
  effectiveFrom: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  changeReason: { type: String, required: true },
}, { timestamps: true });
schema.index({ category: 1, version: 1 }, { unique: true });
export const SecurityPolicy = mongoose.model("SecurityPolicy", schema);
