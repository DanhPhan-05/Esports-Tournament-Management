import { createHash } from "node:crypto";
import { RateLimitBucket } from "../models/RateLimitBucket.js";
import { getPolicy } from "../services/securityPolicy.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const policyRateLimit = asyncHandler(async (req, res, next) => {
  const policy = await getPolicy("RateLimit");
  const windowMs = policy.windowSeconds * 1000;
  const window = Math.floor(Date.now() / windowMs);
  const key = createHash("sha256").update(`${req.ip}:${windowMs}:${window}`).digest("hex");
  let bucket;
  try { bucket = await RateLimitBucket.findOneAndUpdate({ key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * windowMs) } }, { upsert: true, new: true }); }
  catch (error) { if (error.code !== 11000) throw error; bucket = await RateLimitBucket.findOneAndUpdate({ key }, { $inc: { count: 1 } }, { new: true }); }
  res.set("RateLimit-Limit", String(policy.maxRequests));
  res.set("RateLimit-Remaining", String(Math.max(0, policy.maxRequests - bucket.count)));
  if (bucket.count > policy.maxRequests) {
    res.set("Retry-After", String(Math.ceil(((window + 1) * windowMs - Date.now()) / 1000)));
    return res.status(429).json({ success: false, error: { message: "Too many requests" } });
  }
  next();
});
