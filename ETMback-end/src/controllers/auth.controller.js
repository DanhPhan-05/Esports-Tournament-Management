import { addDays, addMinutes } from "../utils/time.js";
import { AuthSession, AuthToken, User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { hashToken, randomToken } from "../utils/crypto.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { sendEmail } from "../services/email.service.js";
import { accountEmail } from "../services/accountEmail.service.js";
import { getPolicy, sessionExpired, validPassword } from "../services/securityPolicy.service.js";
import { assertAccountNotBanned } from "../services/ban.service.js";

const publicUser = (user) => ({ id: user._id, email: user.email, fullName: user.fullName, systemRole: user.systemRole, status: user.status });
const isNativeClient = (req) => req.get('x-etm-client') === 'mobile' && !req.get('origin');

async function issueSession(user, req, res) {
  const refreshToken = signRefreshToken(user);
  const session = await AuthSession.create({ userId: user._id, refreshTokenHash: hashToken(refreshToken), userAgent: req.get("user-agent"), ipAddress: req.ip, expiresAt: addDays(new Date(), Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7)) });
  const accessToken = signAccessToken(user, session._id);
  res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7) * 86400000 });
  return { accessToken, refreshToken };
}

export async function register(req, res) {
  const { email, password, fullName, phone } = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "") || !String(fullName || "").trim() || !await validPassword(password)) throw new ApiError(422, "Valid email, full name and a strong password are required");
  const user = await User.create({ email, fullName, phone, passwordHash: await User.hashPassword(password) });
  const rawToken = randomToken();
  await AuthToken.create({ userId: user._id, tokenHash: hashToken(rawToken), type: "EmailVerification", expiresAt: addDays(new Date(), 1) });
  await sendEmail(accountEmail(user, "verification", rawToken));
  res.status(201).json({ success: true, data: publicUser(user), message: "Check your email to verify the account" });
}

export async function verifyEmail(req, res) {
  const token = await AuthToken.findOneAndUpdate({ tokenHash: hashToken(req.body.token || req.query.token || ""), type: "EmailVerification", usedAt: null, expiresAt: { $gt: new Date() } }, { usedAt: new Date() }, { new: true });
  if (!token) throw new ApiError(400, "Invalid or expired verification token");
  const user = await User.findByIdAndUpdate(token.userId, { status: "Active", emailVerifiedAt: new Date() }, { new: true });
  res.json({ success: true, data: publicUser(user) });
}

export async function login(req, res) {
  const email = String(req.body.email || "").toLowerCase();
  const user = await User.findOne({ email }).select("+passwordHash");
  const policy = await getPolicy("Login");
  if (!user) throw new ApiError(401, "Invalid email or password");
  if (user.lockedUntil && user.lockedUntil > new Date()) throw new ApiError(423, "Account is temporarily locked");
  if (!(await user.verifyPassword(req.body.password || ""))) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= policy.maxAttempts) { user.lockedUntil = addMinutes(new Date(), policy.lockMinutes); user.failedLoginCount = 0; }
    await user.save();
    throw new ApiError(401, "Invalid email or password");
  }
  if (user.status !== "Active") throw new ApiError(403, "Account is not active");
  await assertAccountNotBanned(user._id);
  user.failedLoginCount = 0; user.lockedUntil = null; user.lastLoginAt = new Date(); await user.save();
  const tokens = await issueSession(user, req, res);
  res.json({ success: true, data: { accessToken: tokens.accessToken, ...(isNativeClient(req) ? { refreshToken: tokens.refreshToken } : {}), user: publicUser(user) } });
}

export async function refresh(req, res) {
  const raw = isNativeClient(req) ? req.body.refreshToken : req.cookies?.refreshToken || req.body.refreshToken;
  if (!raw) throw new ApiError(401, "Refresh token required");
  let payload; try { payload = verifyRefreshToken(raw); } catch { throw new ApiError(401, "Invalid refresh token"); }
  const session = await AuthSession.findOne({ userId: payload.sub, refreshTokenHash: hashToken(raw), revokedAt: null, expiresAt: { $gt: new Date() } });
  const user = await User.findById(payload.sub);
  if (!session || !user || user.status !== "Active" || sessionExpired(session, await getPolicy("Session"))) throw new ApiError(401, "Session is no longer valid");
  await assertAccountNotBanned(user._id);
  const claimed = await AuthSession.findOneAndUpdate({ _id: session._id, revokedAt: null }, { revokedAt: new Date() });
  if (!claimed) throw new ApiError(401, "Refresh token has already been used");
  const tokens = await issueSession(user, req, res);
  res.json({ success: true, data: { accessToken: tokens.accessToken, ...(isNativeClient(req) ? { refreshToken: tokens.refreshToken } : {}) } });
}

export async function logout(req, res) {
  const raw = isNativeClient(req) ? req.body.refreshToken : req.cookies?.refreshToken || req.body.refreshToken;
  if (raw) await AuthSession.updateOne({ refreshTokenHash: hashToken(raw) }, { revokedAt: new Date() });
  res.clearCookie("refreshToken"); res.clearCookie("accessToken"); res.status(204).end();
}

export async function forgotPassword(req, res) {
  const user = await User.findOne({ email: String(req.body.email || "").toLowerCase() });
  if (user) {
    const rawToken = randomToken();
    await AuthToken.create({ userId: user._id, tokenHash: hashToken(rawToken), type: "PasswordReset", expiresAt: addMinutes(new Date(), 60) });
    await sendEmail(accountEmail(user, "reset", rawToken));
  }
  res.json({ success: true, message: "If the account exists, reset instructions have been sent" });
}

export async function resetPassword(req, res) {
  if (!await validPassword(req.body.password)) throw new ApiError(422, "Password does not meet policy");
  const token = await AuthToken.findOneAndUpdate({ tokenHash: hashToken(req.body.token || ""), type: "PasswordReset", usedAt: null, expiresAt: { $gt: new Date() } }, { usedAt: new Date() }, { new: true });
  if (!token) throw new ApiError(400, "Invalid or expired reset token");
  await User.updateOne({ _id: token.userId }, { passwordHash: await User.hashPassword(req.body.password), failedLoginCount: 0, lockedUntil: null });
  await AuthSession.updateMany({ userId: token.userId, revokedAt: null }, { revokedAt: new Date() });
  res.json({ success: true, message: "Password changed" });
}

export async function activateAccount(req, res) {
  if (!await validPassword(req.body.password)) throw new ApiError(422, "Password does not meet policy");
  const token = await AuthToken.findOneAndUpdate({ tokenHash: hashToken(req.body.token || ""), type: "AccountActivation", usedAt: null, expiresAt: { $gt: new Date() } }, { usedAt: new Date() }, { new: true });
  if (!token) throw new ApiError(400, "Invalid or expired activation token");
  const user = await User.findById(token.userId); user.passwordHash = await User.hashPassword(req.body.password); user.status = "Active"; user.emailVerifiedAt = new Date(); await user.save();
  res.json({ success: true, data: publicUser(user) });
}

export async function googleCallback(req, res) {
  if (req.user.status !== "Active") throw new ApiError(403, "Account is not active");
  await assertAccountNotBanned(req.user._id);
  await issueSession(req.user, req, res);
  res.redirect(`${process.env.CLIENT_URL}/oauth/callback?authenticated=true`);
}
