import crypto from "node:crypto";

export function issueCsrfToken(_req, res) {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie("csrfToken", token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
  res.json({ success: true, data: { csrfToken: token } });
}

export function csrfProtection(req, res, next) {
  if (process.env.CSRF_ENABLED !== "true" && !req.cookies?.accessToken && !req.cookies?.refreshToken) return next();
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const cookie = req.cookies?.csrfToken; const header = req.get("x-csrf-token");
  if (!cookie || !header || Buffer.byteLength(cookie) !== Buffer.byteLength(header) || !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    return res.status(403).json({ success: false, error: { message: "Invalid CSRF token" } });
  }
  next();
}
