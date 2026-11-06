import { User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { validPassword } from "../services/securityPolicy.service.js";
import { AuthSession } from "../models/index.js";

export async function me(req, res) { res.json({ success: true, data: req.user }); }

export async function updateMe(req, res) {
  for (const key of ["fullName", "phone", "avatarUrl", "address", "privacy", "notificationSettings"]) if (key in req.body) req.user[key] = req.body[key];
  await req.user.save(); res.json({ success: true, data: req.user });
}

export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select("+passwordHash");
  if (!(await user.verifyPassword(req.body.currentPassword || ""))) throw new ApiError(400, "Current password is incorrect");
  if (!await validPassword(req.body.newPassword)) throw new ApiError(422, "New password does not meet policy");
  user.passwordHash = await User.hashPassword(req.body.newPassword); await user.save();
  await AuthSession.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  res.json({ success: true, message: "Password changed" });
}

