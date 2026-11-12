import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

export function pick(body, keys) { return Object.fromEntries(keys.filter((key) => key in body).map((key) => [key, body[key]])); }
export function requireText(value, label = "Reason") {
  if (typeof value !== "string" || !value.trim()) throw new ApiError(422, `${label} is required`);
  return value.trim();
}
export function objectId(value, label = "ID") {
  if (!mongoose.isObjectIdOrHexString(value)) throw new ApiError(422, `${label} is invalid`);
  return value;
}
export function evidence(value = []) {
  if (!Array.isArray(value) || value.length > 10 || value.some((url) => typeof url !== "string" || !/^https?:\/\//i.test(url) || url.length > 2048)) throw new ApiError(422, "Evidence must contain at most 10 HTTP(S) URLs");
  return value;
}
export function searchText(value) { return String(value || "").slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
