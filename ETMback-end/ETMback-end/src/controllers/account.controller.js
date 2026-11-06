import { AuthSession, AuthToken, User } from "../models/index.js";
import { pick, searchText } from "../utils/input.js";
import { sendEmail } from "../services/email.service.js";
import { accountEmail } from "../services/accountEmail.service.js";
import { ApiError } from "../utils/ApiError.js";
import { hashToken, randomToken } from "../utils/crypto.js";
import { pagination } from "../utils/pagination.js";
import { addDays } from "../utils/time.js";

export async function listAccounts(req, res) {
  const { page, limit, skip } = pagination(req.query);
  const filter = { ...(req.query.role ? { systemRole: req.query.role } : {}), ...(req.query.status ? { status: req.query.status } : {}) };
  if (req.query.email) filter.email = { $regex: searchText(req.query.email), $options: "i" };
  const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)]);
  res.json({ success: true, data: items, pagination: { page, limit, total } });
}
export async function getAccount(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "Account not found");
  res.json({ success: true, data: user });
}
export async function updateAccount(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "Account not found");
  if (String(user._id) === String(req.user._id) && (req.body.status && req.body.status !== "Active" || req.body.systemRole && req.body.systemRole !== "Administrator")) throw new ApiError(409, "Administrator cannot disable or demote their own account");
  if (req.body.systemRole === "Administrator" && user.systemRole !== "Administrator") throw new ApiError(422, "Administrator provisioning requires a separate trusted process");
  Object.assign(user, pick(req.body, ["fullName", "phone", "status", "systemRole"]));
  if (req.body.verified === true) { user.emailVerifiedAt = new Date(); user.status = "Active"; }
  if (user.status === "Active") { user.lockedUntil = null; user.failedLoginCount = 0; }
  await user.save();
  await AuthSession.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  res.json({ success: true, data: user });
}
export async function disableAccount(req, res) { req.body = { status: "Inactive" }; return updateAccount(req, res); }
export async function resendActivation(req, res) {
  const user = await User.findById(req.params.id);
  if (!user || user.status !== "Pending") throw new ApiError(409, "Only pending accounts can be activated");
  await AuthToken.updateMany({ userId: user._id, type: "AccountActivation", usedAt: null }, { usedAt: new Date() });
  const rawToken = randomToken();
  await AuthToken.create({ userId: user._id, tokenHash: hashToken(rawToken), type: "AccountActivation", expiresAt: addDays(new Date(), 2) });
  await sendEmail(accountEmail(user, "activation", rawToken));
  res.json({ success: true, message: "Activation email requested" });
}

export async function createStaffAccount(req, res) {
  if (!["ClubManager", "TournamentOrganizer"].includes(req.body.systemRole)) throw new ApiError(422, "Only club managers and tournament organizers can be provisioned here");
  const temporaryPassword = randomToken();
  const user = await User.create({ email: req.body.email, fullName: req.body.fullName, phone: req.body.phone, systemRole: req.body.systemRole, status: "Pending", passwordHash: await User.hashPassword(temporaryPassword), createdBy: req.user._id });
  const rawToken = randomToken();
  await AuthToken.create({ userId: user._id, tokenHash: hashToken(rawToken), type: "AccountActivation", expiresAt: addDays(new Date(), 2) });
  await sendEmail(accountEmail(user, "activation", rawToken));
  res.status(201).json({ success: true, data: user });
}

export async function updateAccountStatus(req, res) {
  if (!req.body.status) throw new ApiError(422, "Status required");
  return updateAccount(req, res);
}
