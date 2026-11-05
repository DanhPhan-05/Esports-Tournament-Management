import mongoose from "mongoose";

const schema = new mongoose.Schema({
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true, maxlength: 10000 },
  evidenceUrls: { type: [String], default: [] },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ["Submitted", "NeedMoreInfo", "Resolved", "Withdrawn"], default: "Submitted", index: true },
  decision: { type: String, enum: ["Accepted", "Rejected"] },
  explanation: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolvedAt: Date,
  resolvingUntil: Date,
  timeline: [{ action: String, note: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, at: { type: Date, default: Date.now } }],
}, { timestamps: true });
export const Protest = mongoose.model("Protest", schema);
