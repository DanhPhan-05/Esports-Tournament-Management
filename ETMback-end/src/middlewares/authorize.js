import { HttpError } from './errorHandler.js';

export const ROLES = Object.freeze(['Guest', 'Customer', 'ClubManager', 'TournamentOrganizer', 'Administrator']);

export function authorize(...allowedRoles) {
  if (allowedRoles.some((role) => !ROLES.includes(role))) throw new Error('Unknown role');
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Authentication required', 'UNAUTHENTICATED'));
    if (!allowedRoles.includes(req.user.role)) return next(new HttpError(403, 'Access denied', 'FORBIDDEN'));
    return next();
  };
}
