import crypto from "node:crypto";
import { ApiError } from "./ApiError.js";

export const randomToken = () => crypto.randomBytes(32).toString("hex");
export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export function normalizeCitizenId(value) {
  const normalized = String(value ?? "").replace(/\D/g, "");
  if (!/^\d{12}$/.test(normalized)) throw new ApiError(422, "CCCD must contain exactly 12 digits");
  return normalized;
}

export function hashCitizenId(value, secret = process.env.CITIZEN_ID_HASH_SECRET) {
  if (!secret) throw new Error("CITIZEN_ID_HASH_SECRET is required");
  const normalized = normalizeCitizenId(value);
  return {
    citizenIdHash: crypto.createHmac("sha256", secret).update(normalized).digest("hex"),
    citizenIdLast4: normalized.slice(-4)
  };
}
