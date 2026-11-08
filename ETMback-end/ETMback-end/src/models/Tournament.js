import mongoose from "mongoose";
import { TOURNAMENT_STATUSES, TOURNAMENT_TYPES } from "../constants/enums.js";

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  organizerAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true, index: true },
  description: String,
  bannerUrl: String,
  tournamentType: { type: String, enum: TOURNAMENT_TYPES, required: true },
  status: { type: String, enum: TOURNAMENT_STATUSES, default: "Draft", index: true },
  maxTeams: { type: Number, required: true, min: 2 },
  minRosterSize: { type: Number, required: true, min: 1 },
  maxRosterSize: { type: Number, required: true, min: 1 },
  registrationOpenAt: { type: Date, required: true },
  registrationCloseAt: { type: Date, required: true },
  rosterLockAt: { type: Date, required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  rules: String,
  venue: String,
  prizePool: String,
  prizeCurrency: {type:String,enum:['VND','USD','EUR','GBP','KRW','JPY','CNY','SGD','SAR']},
  region: String,
  protestHours: { type: Number, default: 72, min: 1, max: 168 },
  postponeReason: String,
  cancelReason: String,
  processingToken: { type: String, select: false },
  processingUntil: { type: Date, select: false },
}, { timestamps: true });

export const Tournament = mongoose.model("Tournament", tournamentSchema);
