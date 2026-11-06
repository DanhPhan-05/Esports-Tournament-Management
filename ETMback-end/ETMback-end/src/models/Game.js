import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  publisher: String,
  logoUrl: String,
  description: String,
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export const Game = mongoose.model("Game", gameSchema);
