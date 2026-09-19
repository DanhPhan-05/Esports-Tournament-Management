import mongoose from "mongoose";

const authTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  type: { type: String, enum: ["EmailVerification", "PasswordReset", "AccountActivation"], required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: Date,
}, { timestamps: true });

export const AuthToken = mongoose.model("AuthToken", authTokenSchema);
