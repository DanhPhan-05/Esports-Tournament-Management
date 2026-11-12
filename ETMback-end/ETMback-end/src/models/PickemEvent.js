import mongoose from "mongoose";

const schema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true, unique: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
  bracketId: { type: mongoose.Schema.Types.ObjectId, ref: "Bracket", required: true },
  opensAt: { type: Date, required: true },
  lockAt: { type: Date, required: true },
  status: { type: String, enum: ["Open", "Locked", "Cancelled"], default: "Open", index: true },
  scoring: { winnerPoints: { type: Number, default: 1, min: 0 }, exactScorePoints: { type: Number, default: 3, min: 0 } },
}, { timestamps: true });
export const PickemEvent = mongoose.model("PickemEvent", schema);
