import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/ApiError.js";
import { validateUpload } from "../utils/uploadPolicy.js";
import { buildAssetLocation, ASSET_SCOPES } from "../utils/assetLocation.js";

export function storageConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && ((process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) || process.env.CLOUDINARY_UPLOAD_PRESET));
}
export async function uploadFile(file, { scope = "document", accountId = "system", entityId, label } = {}) {
  const type = validateUpload(file);
  if (!storageConfigured()) throw new ApiError(503, "Storage is not configured");
  const config = ASSET_SCOPES[scope];
  if (config?.kind && config.kind !== type.resourceType) throw new ApiError(422, `An ${config.kind} is required`);
  const location = buildAssetLocation({ scope, accountId, entityId, label, originalname: file.originalname, type });
  try {
    const result = await new Promise((resolve, reject) => {
      const signed = Boolean(process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
      const options = {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        resource_type: type.resourceType,
        asset_folder: location.assetFolder,
        public_id: location.publicId,
        filename: location.filename,
        filename_override: location.filename,
        tags: ["etm", scope, type.resourceType],
        ...(signed ? { api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, display_name: location.basename, type: "upload", overwrite: false, ...(type.resourceType !== "raw" ? { allowed_formats: [type.extension] } : {}) } : {}),
        timeout: 120000,
      };
      const callback = (error, response) => error ? reject(error) : resolve(response);
      const stream = signed ? cloudinary.uploader.upload_stream(options, callback) : cloudinary.uploader.unsigned_upload_stream(process.env.CLOUDINARY_UPLOAD_PRESET, options, callback);
      stream.on("error", reject);
      stream.end(file.buffer);
    });
    if (typeof result.asset_folder === "string" && result.asset_folder.toLowerCase() !== location.assetFolder.toLowerCase()) throw new ApiError(503, "Cloudinary preset overrides the asset folder; remove the fixed asset folder from the upload preset");
    const url = new URL(result?.secure_url);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) throw new Error("Invalid media response");
    // Persist only this public delivery URL, never the upload buffer or credentials.
    return url.href;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (/upload preset.*not found|unsigned upload.*preset|preset.*must.*unsigned/i.test(error?.message || "")) throw new ApiError(503, "Cloudinary upload preset is not configured for unsigned uploads");
    // Provider errors may contain credential/request details; do not expose them.
    throw new ApiError(502, "Storage upload failed");
  }
}
