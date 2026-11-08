import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index: true },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true, index: true },
  name: { type: String, required: true, trim: true },
  tag: { type: String, required: true, trim: true, uppercase: true, maxlength: 12 },
  logoUrl: String,
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

teamSchema.index({ clubId: 1, gameId: 1, name: 1 }, { unique: true });

export const Team = mongoose.model("Team", teamSchema);
