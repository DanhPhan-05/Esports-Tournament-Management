import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
  bracketId: { type: mongoose.Schema.Types.ObjectId, ref: "Bracket", required: true, index: true },
  round: { type: Number, required: true, min: 1 },
  position: { type: Number, required: true, min: 1 },
  teamAId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
  teamBId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
  nextMatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", default: null },
  nextMatchSlot: { type: String, enum: ["TeamA", "TeamB"], default: null },
  loserNextMatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", default: null },
  loserNextMatchSlot: { type: String, enum: ["TeamA", "TeamB"], default: null },
  section: { type: String, enum: ["Winners", "Losers", "Final", "Reset", "RoundRobin"], default: "Winners" },
  initialTeamAId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
  initialTeamBId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
  isBye: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  streamUrl: String,
  referee: String,
  postponeReason: String,
  scheduledAt: Date,
  venue: String,
  bestOf: { type: Number, default: 3, min: 1 },
  status: { type: String, enum: ["Pending", "Scheduled", "Ongoing", "Completed", "Postponed", "Cancelled"], default: "Pending" },
}, { timestamps: true });

matchSchema.index({ bracketId: 1, round: 1, position: 1 }, { unique: true });

export const Match = mongoose.model("Match", matchSchema);
