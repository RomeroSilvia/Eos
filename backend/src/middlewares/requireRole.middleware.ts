import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

type UserRole = 'user' | 'specialist' | 'center_admin';

export const requireRole = (...roles: UserRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user?.role) {
      throw new ApiError(401, 'Token de autorización requerido.');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'No tenés permiso para acceder a este recurso.');
    }

    next();
  };
};
