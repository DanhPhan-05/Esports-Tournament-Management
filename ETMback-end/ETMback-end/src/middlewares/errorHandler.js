import { ApiError } from "../utils/ApiError.js";

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 422;
    message = "Validation failed";
  }
  if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate resource";
  }
  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid identifier";
  }
  if (error.name === "MulterError") { statusCode = 422; message = "Upload exceeds permitted size or file count"; }
  if (error.name === "VersionError") { statusCode = 409; message = "Resource changed concurrently; reload and retry"; }

  res.status(statusCode).json({
    success: false,
    error: { message, details: error.details || error.errors },
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {})
  });
}
