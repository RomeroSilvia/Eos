import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

type UserRole = 'user' | 'specialist' | 'center_admin';

export const requireRole = (...roles: UserRole[]): RequestHandler => {
  return (req, _res, next) => {
    const currentRole = req.user?.role ?? 'user';

    if (!roles.includes(currentRole)) {
      throw new ApiError(403, 'No tenes permiso para acceder a este recurso.');
    }

    next();
  };
};
