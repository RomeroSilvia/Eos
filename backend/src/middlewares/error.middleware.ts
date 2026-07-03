import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  const isApiError = error instanceof ApiError;
  const statusCode = toValidHttpStatus(isApiError ? error.statusCode : 500);
  const message = isApiError ? error.message : 'Unexpected server error';

  if (!isApiError && env.nodeEnv === 'development') {
    console.error('[unexpected-error]', {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(isApiError && typeof error.details !== 'undefined' ? { details: error.details } : {})
  });
};

function toValidHttpStatus(statusCode: number): number {
  if (Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599) {
    return statusCode;
  }

  return 500;
}
