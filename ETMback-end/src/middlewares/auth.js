import jwt from 'jsonwebtoken';
import { HttpError } from './errorHandler.js';

export function requireAuth(req, _res, next) {
  const bearer = req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  const token = bearer || req.cookies?.access_token;
  if (!token) return next(new HttpError(401, 'Authentication required', 'UNAUTHENTICATED'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!payload.sub) throw new Error('Missing subject');
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(new HttpError(401, 'Invalid or expired session', 'UNAUTHENTICATED'));
  }
}
