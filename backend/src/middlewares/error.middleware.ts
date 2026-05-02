import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;

  res.status(statusCode).json({
    status: 'error',
    message: error instanceof Error ? error.message : 'Unexpected server error',
    stack: env.nodeEnv === 'development' && error instanceof Error ? error.stack : undefined
  });
};
