import mongoose from "mongoose";
import { TOURNAMENT_TYPES } from "../constants/enums.js";

const bracketSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, unique: true },
  type: { type: String, enum: TOURNAMENT_TYPES, required: true },
  status: { type: String, enum: ["Draft", "Published", "Completed"], default: "Draft" },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  generatedAt: { type: Date, default: Date.now },
  seeds: [{ teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" }, seed: Number }],
  rounds: [{ round: Number, matchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Match" }] }],
  changes: [{ reason: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, at: { type: Date, default: Date.now } }],
  predictionEnabled: { type: Boolean, default: true },
  predictionOpenAt: { type: Date, default: Date.now },
  predictionLockAt: { type: Date, required: true },
}, { timestamps: true });

export const Bracket = mongoose.model("Bracket", bracketSchema);
