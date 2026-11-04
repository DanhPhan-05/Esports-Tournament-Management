import mongoose from "mongoose";
import { APPLICATION_STATUSES } from "../constants/enums.js";

const tournamentApplicationSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: APPLICATION_STATUSES, default: "Draft", index: true },
  note: String,
  documents: [String],
  reviewNote: String,
  submittedAt: Date,
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

tournamentApplicationSchema.index({ tournamentId: 1, teamId: 1 }, { unique: true });

export const TournamentApplication = mongoose.model("TournamentApplication", tournamentApplicationSchema);
