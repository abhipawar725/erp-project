import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';

// ─── Standard JSON error response for rate-limit rejections ──────────────────
const rateLimitResponse = (message: string) => ({
  success: false,
  message,
  data: null,
  errors: null,
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared options applied to every limiter
// ─────────────────────────────────────────────────────────────────────────────
const BASE_OPTIONS: Partial<Options> = {
  standardHeaders: true,   // Return RateLimit-* headers in responses
  legacyHeaders:   false,  // Disable X-RateLimit-* legacy headers
  // Use IP from X-Forwarded-For when behind a proxy (Nginx, AWS ALB, Cloudflare)
  keyGenerator: (req: Request): string =>
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown',
};

// ─────────────────────────────────────────────────────────────────────────────
// globalLimiter — applied to all /api/* routes
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Protects every API endpoint from excessive request volume.
 * Default: 100 requests per 15 minutes per IP.
 * Configurable via env: RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX.
 *
 * Usage (app.ts):
 *   app.use('/api', globalLimiter);
 */
export const globalLimiter: RateLimitRequestHandler = rateLimit({
  ...BASE_OPTIONS,
  windowMs: env.rateLimit.windowMs,
  max:      env.rateLimit.max,
  message:  rateLimitResponse(
    'Too many requests from this IP. Please wait a few minutes before trying again.',
  ),
  // Log when rate limit is hit (useful for abuse detection)
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] Global limit hit — IP: ${req.ip}, URL: ${req.originalUrl}`);
    res.status(429).json(
      rateLimitResponse('Too many requests from this IP. Please wait a few minutes before trying again.'),
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// authLimiter — applied to /api/auth/login and /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Strict limiter for authentication endpoints to slow brute-force attacks.
 * 10 requests per 15 minutes per IP.
 * Only failed attempts count (skipSuccessfulRequests: true).
 *
 * Usage (app.ts):
 *   app.use('/api/auth/login', authLimiter);
 *   app.use('/api/auth/register', authLimiter);
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  ...BASE_OPTIONS,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      10,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: rateLimitResponse(
    'Too many login attempts from this IP. Please wait 15 minutes before trying again.',
  ),
  handler: (req: Request, res: Response) => {
    console.warn(`[RateLimit] Auth limit hit — IP: ${req.ip}`);
    res.status(429).json(
      rateLimitResponse(
        'Too many login attempts from this IP. Please wait 15 minutes before trying again.',
      ),
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// passwordResetLimiter — for /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Prevents abuse of the password reset email endpoint.
 * 5 requests per 60 minutes per IP.
 *
 * Usage (app.ts):
 *   app.use('/api/auth/forgot-password', passwordResetLimiter);
 */
export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  ...BASE_OPTIONS,
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      5,
  message: rateLimitResponse(
    'Too many password reset requests. Please try again in 1 hour.',
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// uploadLimiter — applied to file upload endpoints
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Prevents upload flooding.
 * 20 upload requests per minute per IP.
 *
 * Usage:
 *   router.post('/avatar', authenticate, uploadLimiter, uploadAvatar.single('avatar'), handler);
 */
export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  ...BASE_OPTIONS,
  windowMs: 60 * 1000, // 1 minute
  max:      20,
  message: rateLimitResponse(
    'Upload rate limit exceeded. Please slow down.',
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// apiKeyLimiter — for high-throughput API consumers (e.g. webhook sources)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Per-API-key rate limiting for service-to-service integrations.
 * 1000 requests per minute per API key.
 * Falls back to IP if no x-api-key header is present.
 *
 * Usage:
 *   router.post('/webhook/naukri', apiKeyLimiter, webhookHandler);
 */
export const apiKeyLimiter: RateLimitRequestHandler = rateLimit({
  ...BASE_OPTIONS,
  windowMs: 60 * 1000,
  max:      1000,
  keyGenerator: (req: Request): string =>
    (req.headers['x-api-key'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown',
  message: rateLimitResponse('API rate limit exceeded.'),
});

// ─────────────────────────────────────────────────────────────────────────────
// createCustomLimiter — factory for ad-hoc limiters
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Creates a one-off rate limiter with custom settings.
 *
 * Usage:
 *   const bulkImportLimiter = createCustomLimiter(60 * 60_000, 3, 'Bulk import limit: 3 per hour');
 *   router.post('/import', authenticate, bulkImportLimiter, importHandler);
 */
export function createCustomLimiter(
  windowMs: number,
  max: number,
  message = 'Rate limit exceeded. Please try again later.',
): RateLimitRequestHandler {
  return rateLimit({
    ...BASE_OPTIONS,
    windowMs,
    max,
    message: rateLimitResponse(message),
  });
}
