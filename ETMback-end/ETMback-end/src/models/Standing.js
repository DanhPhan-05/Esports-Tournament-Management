import mongoose from "mongoose";

const standingSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  played: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  scoreFor: { type: Number, default: 0 },
  scoreAgainst: { type: Number, default: 0 },
  rank: Number,
}, { timestamps: true });

standingSchema.index({ tournamentId: 1, teamId: 1 }, { unique: true });

export const Standing = mongoose.model("Standing", standingSchema);
