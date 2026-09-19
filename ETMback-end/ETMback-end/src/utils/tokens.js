import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

export const signAccessToken = (user, sessionId) => jwt.sign(
  { sub: user._id.toString(), role: user.systemRole, ...(sessionId ? { sid: String(sessionId) } : {}) },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" }
);

export const signRefreshToken = (user) => jwt.sign(
  { sub: user._id.toString(), type: "refresh", jti: randomUUID() },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: `${Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7)}d` }
);

export const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);
