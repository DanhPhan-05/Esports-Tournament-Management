import { randomUUID } from "node:crypto";
import { ApiError } from "./ApiError.js";

export const ASSET_SCOPES = {
  avatar: { collection: "accounts", purpose: "avatars", prefix: "avatar", kind: "image" },
  club: { collection: "clubs", purpose: "logos", prefix: "logo", kind: "image" },
  "club-logo": { collection: "clubs", purpose: "logos", prefix: "logo", kind: "image" },
  team: { collection: "teams", purpose: "logos", prefix: "logo", kind: "image" },
  game: { collection: "games", purpose: "logos", prefix: "logo", kind: "image" },
  tournament: { collection: "tournaments", purpose: "banners", prefix: "banner", kind: "image" },
  "content-image": { collection: "contents", purpose: "images", prefix: "cover", kind: "image" },
  "content-video": { collection: "contents", purpose: "videos", prefix: "video", kind: "video" },
  application: { collection: "applications", purpose: "documents", prefix: "attachment" },
  protest: { collection: "protests", purpose: "evidence", prefix: "evidence" },
  match: { collection: "matches", purpose: "evidence", prefix: "evidence" },
  report: { collection: "reports", purpose: "evidence", prefix: "evidence" },
  image: { collection: "shared", purpose: "images", prefix: "image", kind: "image" },
  video: { collection: "shared", purpose: "videos", prefix: "video", kind: "video" },
  document: { collection: "shared", purpose: "documents", prefix: "attachment" },
  verification: { collection: "system", purpose: "verification", prefix: "verification" },
};
export function assetSlug(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
}
export function buildAssetLocation({ scope = "document", accountId = "system", entityId, label, originalname, type, now = new Date() }) {
  const config = ASSET_SCOPES[scope];
  if (!Object.hasOwn(ASSET_SCOPES, scope)) throw new ApiError(422, "Unknown upload scope");
  if (![accountId, entityId].filter(v => v != null && v !== "").every(v => /^[a-zA-Z0-9_-]+$/.test(String(v)))) throw new ApiError(422, "Invalid upload owner");
  const root = (process.env.CLOUDINARY_FOLDER || "folder/ETM").replace(/^\/+|\/+$/g, "");
  if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(root)) throw new ApiError(503, "Invalid Cloudinary folder configuration");
  const original = String(originalname || "").split(/[\\/]/).pop().replace(/\.[^.]*$/, "");
  const name = assetSlug(label) || assetSlug(original) || config.prefix;
  const date = now.toISOString();
  const owner = scope === "avatar" ? accountId : entityId || `drafts/${accountId}`;
  const location = config.collection === "shared" || config.collection === "system"
    ? `${config.collection}/${config.purpose}/${accountId}` : `${config.collection}/${owner}/${config.purpose}`;
  const assetFolder = `${root}/${location}/${date.slice(0,4)}/${date.slice(5,7)}`;
  const stem = name === config.prefix ? name : `${config.prefix}-${name}`;
  const basename = `${stem}-${date.replace(/[-:.]/g, "")}-${randomUUID().replaceAll("-", "").slice(0,12)}`;
  return { assetFolder, basename, filename: `${basename}.${type.extension}`, publicId: `${assetFolder}/${basename}${type.resourceType === "raw" ? `.${type.extension}` : ""}` };
}
