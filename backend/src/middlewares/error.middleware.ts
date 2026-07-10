import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  const isApiError = error instanceof ApiError;
  const statusCode = toValidHttpStatus(isApiError ? error.statusCode : 500);
  const message = isApiError ? error.message : 'Unexpected server error';

  if (!isApiError && env.nodeEnv === 'development') {
    const unexpected = normalizeUnexpectedError(error);

    console.error('[unexpected-error]', {
      name: unexpected.name,
      message: unexpected.message,
      ...(unexpected.code ? { code: unexpected.code } : {}),
      ...(unexpected.details ? { details: unexpected.details } : {}),
      ...(unexpected.hint ? { hint: unexpected.hint } : {})
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

function normalizeUnexpectedError(error: unknown): {
  name: string;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message || 'Unknown error'
    };
  }

  if (error && typeof error === 'object') {
    const candidate = error as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      error_description?: unknown;
    };

    const details = toOptionalString(candidate.details);
    const hint = toOptionalString(candidate.hint);
    const message =
      toOptionalString(candidate.message)
      ?? toOptionalString(candidate.error_description)
      ?? details
      ?? hint
      ?? 'Unknown error object';

    return {
      name: toOptionalString(candidate.name) ?? 'object',
      message,
      code: toOptionalString(candidate.code),
      details,
      hint
    };
  }

  return {
    name: typeof error,
    message: String(error)
  };
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
