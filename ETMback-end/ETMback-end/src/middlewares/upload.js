import multer from "multer";
import { UPLOAD_TYPES, validateUpload } from "../utils/uploadPolicy.js";
import { ApiError } from "../utils/ApiError.js";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    callback(UPLOAD_TYPES[file.mimetype] ? null : new ApiError(422, "Unsupported upload file type"), Boolean(UPLOAD_TYPES[file.mimetype]));
  }
});

export function checkUploadSize(req, _res, next) {
  try { if (req.file) validateUpload(req.file); next(); } catch (error) { next(error); }
}
