import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

// ─────────────────────────────────────────────────────────────────────────────
// AppError — operational error class
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Throw this anywhere in your services or controllers for controlled error responses.
 * The global `errorHandler` middleware picks it up and responds cleanly.
 *
 * @example
 *   throw new AppError('Employee not found', 404);
 *   throw new AppError('Email already exists', 409, [{ field: 'email', message: '...' }]);
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    errors?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors ?? null;
    this.isOperational = true; // Distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// errorHandler — global Express error handler (must be last middleware)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Catches all errors forwarded via `next(err)` and returns a consistent
 * JSON error response in the standard API format.
 *
 * Handles:
 *   • AppError               — operational errors (404, 409, 422, etc.)
 *   • Sequelize errors       — unique constraint, validation, FK violation
 *   • JWT errors             — expired / invalid tokens
 *   • Multer errors          — file upload failures
 *   • SyntaxError            — malformed JSON body
 *   • Unknown errors         — 500 with sanitised message in production
 *
 * Register in app.ts AFTER all routes:
 *   app.use(notFoundHandler);
 *   app.use(errorHandler);
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ─── 1. AppError (operational) ──────────────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data:    null,
      errors:  err.errors ?? null,
    });
    return;
  }

  // ─── 2. Sequelize unique constraint violation ────────────────────────────────
  if ((err as any).name === 'SequelizeUniqueConstraintError') {
    const fields = (err as any).errors?.map((e: any) => ({
      field:   e.path,
      message: `${e.path} already exists`,
      value:   process.env.NODE_ENV !== 'production' ? e.value : undefined,
    }));
    res.status(409).json({
      success: false,
      message: 'A record with that value already exists',
      data:    null,
      errors:  fields ?? null,
    });
    return;
  }

  // ─── 3. Sequelize validation error ───────────────────────────────────────────
  if ((err as any).name === 'SequelizeValidationError') {
    const fields = (err as any).errors?.map((e: any) => ({
      field:   e.path,
      message: e.message,
    }));
    res.status(422).json({
      success: false,
      message: 'Database validation failed',
      data:    null,
      errors:  fields ?? null,
    });
    return;
  }

  // ─── 4. Sequelize foreign key constraint ─────────────────────────────────────
  if ((err as any).name === 'SequelizeForeignKeyConstraintError') {
    res.status(422).json({
      success: false,
      message: 'Referenced record does not exist (foreign key constraint)',
      data:    null,
      errors:  null,
    });
    return;
  }

  // ─── 5. Sequelize connection error ───────────────────────────────────────────
  if ((err as any).name === 'SequelizeConnectionError' || (err as any).name === 'SequelizeConnectionRefusedError') {
    logger.error('[DB] Connection error:', err.message);
    res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please try again.',
      data:    null,
      errors:  null,
    });
    return;
  }

  // ─── 6. JWT errors ────────────────────────────────────────────────────────────
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Session expired. Please log in again.',
      data:    null,
      errors:  null,
    });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
      data:    null,
      errors:  null,
    });
    return;
  }

  // ─── 7. Multer errors (file upload) ──────────────────────────────────────────
  if ((err as any).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      message: 'Uploaded file exceeds the maximum allowed size.',
      data:    null,
      errors:  null,
    });
    return;
  }

  if ((err as any).code === 'LIMIT_UNEXPECTED_FILE') {
    res.status(400).json({
      success: false,
      message: `Unexpected file field: "${(err as any).field}"`,
      data:    null,
      errors:  null,
    });
    return;
  }

  // ─── 8. JSON parse error (malformed request body) ────────────────────────────
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body. Please check your request format.',
      data:    null,
      errors:  null,
    });
    return;
  }

  // ─── 9. Cast error (invalid ID format, NaN, etc.) ────────────────────────────
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid value format for one of the request parameters.',
      data:    null,
      errors:  null,
    });
    return;
  }

  // ─── 10. Unknown / programming errors ────────────────────────────────────────
  // Log the full error including stack trace
  logger.error(`[Unhandled] ${req.method} ${req.originalUrl}`, {
    error:   err.message,
    stack:   err.stack,
    body:    process.env.NODE_ENV !== 'production' ? req.body : undefined,
    userId:  (req as any).user?.userId,
  });

  res.status(500).json({
    success: false,
    // Never leak internal details in production
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Our team has been notified.'
      : err.message,
    data:   null,
    errors: process.env.NODE_ENV !== 'production' ? { stack: err.stack } : null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// notFoundHandler — catch-all for unmatched routes
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns a 404 for any request that doesn't match a registered route.
 * Must be registered AFTER all routes and BEFORE errorHandler.
 *
 * Usage in app.ts:
 *   app.use(notFoundHandler);
 *   app.use(errorHandler);
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data:    null,
    errors:  null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// asyncHandler — wraps async route handlers to forward thrown errors to next()
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Eliminates the need for try/catch in every async controller.
 * Automatically forwards any thrown error to Express's error handler.
 *
 * Usage:
 *   router.get('/:id', asyncHandler(async (req, res) => {
 *     const emp = await employeeService.findById(req.params.id);
 *     sendResponse(res, { data: emp });
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
