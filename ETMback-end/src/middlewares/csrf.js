import { randomBytes } from 'node:crypto';
import { doubleCsrf } from 'csrf-csrf';
import { HttpError } from './errorHandler.js';

const SESSION_COOKIE = 'csrf_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.COOKIE_SECRET,
  getSessionIdentifier: (req) => req.signedCookies?.[SESSION_COOKIE] || '',
  cookieName: process.env.NODE_ENV === 'production' ? '__Host-etm.csrf' : 'etm.csrf',
  cookieOptions,
  getCsrfTokenFromRequest: (req) => req.get('x-csrf-token'),
});

export function issueCsrfToken(req, res) {
  if (!req.signedCookies?.[SESSION_COOKIE]) {
    const id = randomBytes(32).toString('hex');
    res.cookie(SESSION_COOKIE, id, { ...cookieOptions, signed: true });
    req.signedCookies[SESSION_COOKIE] = id;
  }
  res.json({ csrfToken: generateCsrfToken(req, res, { overwrite: true }) });
}

export function requireCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (!req.signedCookies?.[SESSION_COOKIE]) return next(new HttpError(403, 'Invalid CSRF token', 'INVALID_CSRF'));
  return doubleCsrfProtection(req, res, (error) => next(error ? new HttpError(403, 'Invalid CSRF token', 'INVALID_CSRF') : undefined));
}
