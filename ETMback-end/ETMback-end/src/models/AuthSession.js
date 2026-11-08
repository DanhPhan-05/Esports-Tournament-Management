import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  refreshTokenHash: { type: String, required: true, unique: true },
  userAgent: String,
  ipAddress: String,
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: Date,
  lastUsedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const AuthSession = mongoose.model("AuthSession", authSessionSchema);
