import mongoose from "mongoose";

const rosterChangeRequestSchema = new mongoose.Schema({
  rosterId: { type: mongoose.Schema.Types.ObjectId, ref: "Roster", required: true, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  addMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ClubMember" }],
  removeMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ClubMember" }],
  reason: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
  reviewNote: String,
}, { timestamps: true, optimisticConcurrency: true });

export const RosterChangeRequest = mongoose.model("RosterChangeRequest", rosterChangeRequestSchema);
