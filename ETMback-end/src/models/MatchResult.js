import mongoose from "mongoose";

const matchResultSchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true, unique: true },
  teamAScore: { type: Number, required: true, min: 0 },
  teamBScore: { type: Number, required: true, min: 0 },
  winnerTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  isForfeit: { type: Boolean, default: false },
  evidenceUrls: [String],
  status: { type: String, enum: ["Draft", "Confirmed"], default: "Confirmed", index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  confirmedAt: Date,
  revision: { type: Number, default: 1 },
  games: [{ game: Number, teamAScore: Number, teamBScore: Number }],
  statistics: mongoose.Schema.Types.Mixed,
  correctionReason: String,
}, { timestamps: true });

export const MatchResult = mongoose.model("MatchResult", matchResultSchema);
