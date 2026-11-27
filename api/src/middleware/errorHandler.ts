import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, internalError, routeNotFound } from '../errors.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(routeNotFound());
};

const isJsonParseError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { type?: unknown; status?: unknown; statusCode?: unknown };
  return candidate.type === 'entity.parse.failed' && (candidate.status === 400 || candidate.statusCode === 400);
};

export const errorHandler: ErrorRequestHandler = (error, _req, response, _next) => {
  const appError = error instanceof AppError
    ? error
    : isJsonParseError(error)
      ? new AppError(400, 'INVALID_JSON', 'The request body is not valid JSON.')
      : internalError();
  response.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  });
};
