import mongoose from "mongoose";
import { ROSTER_STATUSES } from "../constants/enums.js";

const rosterEntrySchema = new mongoose.Schema({
  clubMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "ClubMember", required: true },
  role: { type: String, enum: ["Player", "Captain", "Substitute"], default: "Player" },
  inGameName: String,
}, { _id: false });

const rosterSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "TournamentApplication", required: true, unique: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
  entries: { type: [rosterEntrySchema], default: [] },
  status: { type: String, enum: ROSTER_STATUSES, default: "Draft" },
  submittedAt: Date,
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rejectionReason: String,
}, { timestamps: true, optimisticConcurrency: true });

export const Roster = mongoose.model("Roster", rosterSchema);
