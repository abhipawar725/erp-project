import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';

// ─── Normalised error shape returned to the client ────────────────────────────
interface ApiValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// validate
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Collects errors produced by `express-validator` chains that ran before this
 * middleware and responds with a structured 422 Unprocessable Entity if any
 * errors are present.
 *
 * Place this AFTER your validation chains and BEFORE the route handler:
 *
 *   router.post(
 *     '/',
 *     [body('email').isEmail(), body('password').isLength({ min: 8 })],
 *     validate,       ← collects errors from the chains above
 *     createHandler,  ← only reached when input is valid
 *   );
 *
 * Response format on failure (422):
 *   {
 *     success: false,
 *     message: "Validation failed",
 *     data: null,
 *     errors: [
 *       { field: "email",    message: "Must be a valid email address" },
 *       { field: "password", message: "Must be at least 8 characters" }
 *     ]
 *   }
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const result = validationResult(req);

  if (result.isEmpty()) {
    next();
    return;
  }

  const errors: ApiValidationError[] = result.array().map((err: ValidationError) => ({
    field:   (err as any).path ?? (err as any).param ?? 'unknown',
    message: err.msg,
    // Include the invalid value only in non-production environments
    ...(process.env.NODE_ENV !== 'production' && { value: (err as any).value }),
  }));

  res.status(422).json({
    success: false,
    message: `Validation failed: ${errors.map((e) => `${e.field} — ${e.message}`).join('; ')}`,
    data: null,
    errors,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// validateBody — convenience wrapper that validates req.body against a
// plain object schema without express-validator chains.
// Useful for one-off inline validations in integration tests or scripts.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @example
 *   router.post('/webhook', validateBody({ event: 'string', payload: 'object' }), handler);
 */
export function validateBody(shape: Record<string, 'string' | 'number' | 'boolean' | 'object'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ApiValidationError[] = [];

    for (const [field, type] of Object.entries(shape)) {
      const value = req.body[field];
      if (value === undefined || value === null) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }
      // eslint-disable-next-line valid-typeof
      if (typeof value !== type) {
        errors.push({ field, message: `${field} must be of type ${type}` });
      }
    }

    if (errors.length > 0) {
      res.status(422).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors,
      });
      return;
    }

    next();
  };
}
