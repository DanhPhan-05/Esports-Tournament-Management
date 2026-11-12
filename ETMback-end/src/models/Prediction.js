import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
  bracketId: { type: mongoose.Schema.Types.ObjectId, ref: "Bracket", required: true, index: true },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true, index: true },
  predictedTeam1Id: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  predictedTeam2Id: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  predictedWinnerTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  predictedTeam1Score: { type: Number, required: true, min: 0 },
  predictedTeam2Score: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["Active", "Locked", "Scored", "Cancelled"], default: "Active", index: true },
  submittedAt: { type: Date, default: Date.now },
  lockedAt: Date,
  scoredAt: Date,
  actualWinnerTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
  isCorrect: { type: Boolean, default: null },
  pointsAwarded: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

predictionSchema.index({ userId: 1, matchId: 1 }, { unique: true });
predictionSchema.index({ pointsAwarded: -1, scoredAt: 1 });

export const Prediction = mongoose.model("Prediction", predictionSchema);
