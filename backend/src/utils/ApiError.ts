export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = toValidHttpStatus(statusCode);
    this.details = details;
  }
}

function toValidHttpStatus(statusCode: number): number {
  if (Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599) {
    return statusCode;
  }

  return 500;
}
