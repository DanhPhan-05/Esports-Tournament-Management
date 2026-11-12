import { SecurityPolicy } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";

export const DEFAULT_POLICIES = {
  Password: { minLength: 8 },
  Login: { maxAttempts: 5, lockMinutes: 15 },
  Session: { maxAgeMinutes: 10080, idleMinutes: 1440 },
  RateLimit: { windowSeconds: 900, maxRequests: 1000 },
};
const bounds = {
  Password: { minLength: [8, 128] },
  Login: { maxAttempts: [3, 10], lockMinutes: [5, 1440] },
  Session: { maxAgeMinutes: [5, 10080], idleMinutes: [1, 1440] },
  RateLimit: { windowSeconds: [1, 3600], maxRequests: [5, 10000] },
};
export function validatePolicy(category, config) {
  if (!bounds[category] || !config || typeof config !== "object" || Array.isArray(config)) throw new ApiError(422, "Unknown policy category or invalid config");
  if (Object.keys(config).some((key) => !bounds[category][key])) throw new ApiError(422, "Unknown policy setting");
  const merged = { ...DEFAULT_POLICIES[category], ...config };
  for (const [key, [min, max]] of Object.entries(bounds[category])) {
    if (!Number.isInteger(merged[key]) || merged[key] < min || merged[key] > max) throw new ApiError(422, `${key} must be an integer between ${min} and ${max}`);
  }
  if (category === "Session" && merged.idleMinutes > merged.maxAgeMinutes) throw new ApiError(422, "Idle timeout must not exceed session maximum age");
  return merged;
}
export async function getPolicy(category, now = new Date()) {
  const active = await SecurityPolicy.findOne({ category, isActive: true, effectiveFrom: { $lte: now } }).sort({ version: -1 });
  return active?.config || DEFAULT_POLICIES[category];
}
export async function validPassword(value) {
  const config = await getPolicy("Password");
  return typeof value === "string" && value.length >= config.minLength && value.length <= 128 && /[A-Za-z]/.test(value) && /\d/.test(value) && /[^A-Za-z\d]/.test(value);
}
export function sessionExpired(session, config, now = new Date()) {
  return session.revokedAt || session.expiresAt <= now
    || now - new Date(session.createdAt) >= config.maxAgeMinutes * 60000
    || now - new Date(session.lastUsedAt || session.createdAt) >= config.idleMinutes * 60000;
}
