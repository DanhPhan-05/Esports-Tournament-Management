import { AuthSession, User } from "../models/index.js";
import { getPolicy, sessionExpired } from "../services/securityPolicy.service.js";
import { assertAccountNotBanned } from "../services/ban.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/tokens.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const token = bearer || req.cookies?.accessToken;
  if (!token) throw new ApiError(401, "Authentication required");

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }

  const user = await User.findById(payload.sub).select("-passwordHash");
  if (!user || user.status !== "Active") throw new ApiError(401, "Account is not active");
  const session = payload.sid ? await AuthSession.findOne({ _id: payload.sid, userId: user._id }) : null;
  if (!session || sessionExpired(session, await getPolicy("Session"))) throw new ApiError(401, "Session expired; sign in again");
  await assertAccountNotBanned(user._id);
  session.lastUsedAt = new Date(); await session.save();
  req.user = user;
  next();
});

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.systemRole)) return next(new ApiError(403, "Forbidden"));
    next();
  };
}
