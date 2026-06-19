import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

export const requireRole = (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'No tenés permiso para acceder a este recurso.');
    }

    next();
  };
