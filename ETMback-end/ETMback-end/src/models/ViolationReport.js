import mongoose from "mongoose";

export const REPORT_TARGETS = { Match: "Match" };
export const REPORT_CATEGORIES = ["Kết quả trận đấu", "Vi phạm luật thi đấu"];
const schema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetType: { type: String, enum: Object.keys(REPORT_TARGETS), required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true, index: true },
  category: { type: String, enum: REPORT_CATEGORIES, required: true, trim: true },
  description: { type: String, required: true, maxlength: 10000 },
  evidenceUrls: { type: [String], default: [] },
  status: { type: String, enum: ["Submitted", "UnderReview", "Resolved", "Rejected"], default: "Submitted", index: true },
  resolution: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
}, { timestamps: true });
export const ViolationReport = mongoose.model("ViolationReport", schema);
