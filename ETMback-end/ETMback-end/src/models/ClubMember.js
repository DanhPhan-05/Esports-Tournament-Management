import mongoose from "mongoose";
import { TEAM_ROLES } from "../constants/enums.js";

const clubMemberSchema = new mongoose.Schema({
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null, index: true },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", default: null },
  citizenIdHash: { type: String, required: true, index: true },
  citizenIdLast4: { type: String, required: true, minlength: 4, maxlength: 4 },
  fullName: { type: String, required: true, trim: true },
  dateOfBirth: Date,
  nationality: String,
  inGameName: { type: String, trim: true },
  teamRole: { type: String, enum: TEAM_ROLES, default: "Player" },
  activeFrom: { type: Date, required: true, index: true },
  activeUntil: { type: Date, default: null, index: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

clubMemberSchema.index({ clubId: 1, citizenIdHash: 1, activeFrom: 1 }, { unique: true });

export const ClubMember = mongoose.model("ClubMember", clubMemberSchema);
