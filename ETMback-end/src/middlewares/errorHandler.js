import multer from 'multer';

export class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'Route not found', 'NOT_FOUND'));
}

export function errorHandler(error, _req, res, _next) {
  const uploadStatus = error instanceof multer.MulterError ? (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400) : undefined;
  const status = uploadStatus || (Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500);
  if (status === 500) console.error(error);
  res.status(status).json({ error: { code: error.code || 'INTERNAL_ERROR', message: status === 500 ? 'Internal server error' : error.message } });
}
