import { randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from './errorHandler.js';

const COOKIE = 'csrf_token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function issueCsrfToken(_req, res) {
  const token = randomBytes(32).toString('hex');
  res.cookie(COOKIE, token, { httpOnly: false, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  res.json({ csrfToken: token });
}

export function requireCsrf(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookie = req.cookies[COOKIE];
  const header = req.get('x-csrf-token');
  if (!cookie || !header || cookie.length !== header.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    return next(new HttpError(403, 'Invalid CSRF token', 'INVALID_CSRF'));
  }
  return next();
}
