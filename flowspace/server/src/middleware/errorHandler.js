import { env } from '../config/env.js';

/**
 * Custom operational error class with structured HTTP status code, machine-readable code,
 * and optional validation/context details.
 */
export class AppError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} code
   * @param {string} message
   * @param {any} [details=null]
   */
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Wraps an async Express route handler or middleware and forwards rejections to `next(err)`.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Catch-all 404 handler for unmatched API routes.
 */
export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}

/**
 * Centralized Express error-handling middleware.
 * Normalizes MySQL duplicate errors, Zod validation errors, and operational AppErrors
 * into `{ error: { code, message, details? } }`.
 */
export function errorHandler(err, _req, res, _next) {
  // 1. MySQL duplicate key error -> HTTP 409 Conflict
  if (err?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A record with that value already exists.',
      },
    });
  }

  // 2. Zod validation error -> HTTP 400 Bad Request
  if (err?.name === 'ZodError' || Array.isArray(err?.issues)) {
    const fieldErrors = {};
    for (const issue of err.issues || []) {
      const key = issue.path?.length ? issue.path.join('.') : '_root';
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    const firstIssue = err.issues?.[0];
    const firstMessage = firstIssue
      ? `${firstIssue.path?.length ? `${firstIssue.path.join('.')}: ` : ''}${firstIssue.message}`
      : 'Validation failed';

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: firstMessage,
        details: Object.keys(fieldErrors).length ? fieldErrors : err.issues || null,
      },
    });
  }

  // 3. Malformed JSON payload -> HTTP 400
  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON in request body',
      },
    });
  }

  // 4. Operational AppError (or error carrying explicit statusCode/status)
  if (err instanceof AppError || (err?.statusCode && err?.code)) {
    const statusCode = Number(err.statusCode) || 400;
    const payload = {
      error: {
        code: err.code || 'APP_ERROR',
        message: err.message || 'Request failed',
      },
    };
    if (err.details !== null && err.details !== undefined) {
      payload.error.details = err.details;
    }
    return res.status(statusCode).json(payload);
  }

  if (err?.status && err?.code) {
    return res.status(Number(err.status)).json({
      error: {
        code: err.code,
        message: err.message || 'Request failed',
      },
    });
  }

  // 5. Unexpected 500 Internal Server Error
  if (!env.isTest) {
    console.error('[FlowSpace Unhandled Error]', err);
  }

  const responseError = {
    code: 'INTERNAL_ERROR',
    message: env.isProd
      ? 'An unexpected internal error occurred.'
      : err?.message || 'An unexpected internal error occurred.',
  };

  if (!env.isProd && err?.stack) {
    responseError.stack = err.stack;
  }

  return res.status(500).json({ error: responseError });
}

export default {
  AppError,
  asyncHandler,
  notFoundHandler,
  errorHandler,
};
