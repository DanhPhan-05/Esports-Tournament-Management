import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { SYSTEM_ROLES, USER_STATUSES } from "../constants/enums.js";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: function requiredPassword() { return !this.googleId; }, select: false },
  googleId: { type: String, unique: true, sparse: true, index: true },
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, trim: true },
  avatarUrl: String,
  address: String,
  privacy: { showProfile: { type: Boolean, default: true } },
  notificationSettings: { email: { type: Boolean, default: true }, inApp: { type: Boolean, default: true } },
  systemRole: { type: String, enum: SYSTEM_ROLES, default: "Customer", index: true },
  status: { type: String, enum: USER_STATUSES, default: "Pending", index: true },
  emailVerifiedAt: Date,
  failedLoginCount: { type: Number, default: 0 },
  lockedUntil: Date,
  lastLoginAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

userSchema.methods.verifyPassword = function verifyPassword(password) {
  if (!this.passwordHash || typeof password !== "string") return false;
  return bcrypt.compare(password, this.passwordHash);
};
userSchema.statics.hashPassword = (password) => bcrypt.hash(password, 12);

userSchema.set("toJSON", { transform(_doc, ret) { delete ret.passwordHash; return ret; } });
export const User = mongoose.model("User", userSchema);
