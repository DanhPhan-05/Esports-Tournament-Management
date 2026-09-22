import { ApiError } from "./ApiError.js";

export const UPLOAD_TYPES = {
  "image/png": { resourceType: "image", extension: "png", maxBytes: 10 * 1024 * 1024 },
  "image/jpeg": { resourceType: "image", extension: "jpg", maxBytes: 10 * 1024 * 1024 },
  "image/webp": { resourceType: "image", extension: "webp", maxBytes: 10 * 1024 * 1024 },
  "video/mp4": { resourceType: "video", extension: "mp4", maxBytes: 50 * 1024 * 1024 },
  "video/webm": { resourceType: "video", extension: "webm", maxBytes: 50 * 1024 * 1024 },
  "video/quicktime": { resourceType: "video", extension: "mov", maxBytes: 50 * 1024 * 1024 },
  "application/pdf": { resourceType: "raw", extension: "pdf", maxBytes: 10 * 1024 * 1024 },
  "application/msword": { resourceType: "raw", extension: "doc", maxBytes: 10 * 1024 * 1024 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { resourceType: "raw", extension: "docx", maxBytes: 10 * 1024 * 1024 },
};
export function validateUpload(file) {
  const type = UPLOAD_TYPES[file?.mimetype];
  if (!type) throw new ApiError(422, "Unsupported upload file type");
  const size = file.buffer?.length ?? file.size;
  if (!Number.isFinite(size) || size < 1) throw new ApiError(422, "Upload file is empty");
  if (size > type.maxBytes) throw new ApiError(422, "Images and documents are limited to 10 MB; videos to 50 MB");
  return type;
}
