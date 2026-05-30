import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/response';

// ─── Extend Express Request with authenticated user ────────────────────────────
declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by `authenticate` after a valid JWT is verified.
       * Guaranteed to be defined on any route that uses `authenticate`.
       */
      user?: JwtPayload;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// authenticate
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Verifies the JWT Bearer token from the Authorization header.
 *
 * On success  → decodes the payload into `req.user` and calls `next()`.
 * On failure  → responds with 401 Unauthorized.
 *
 * Usage:
 *   router.get('/profile', authenticate, handler);
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Unauthorized: Authorization header missing or malformed', 401);
      return;
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    req.user = verifyAccessToken(token);
    next();
  } catch (err: any) {
    // jsonwebtoken throws TokenExpiredError or JsonWebTokenError
    const message =
      err?.name === 'TokenExpiredError'
        ? 'Unauthorized: Token has expired — please refresh your session'
        : 'Unauthorized: Invalid token';
    sendError(res, message, 401);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// authorize
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Permission-slug-based access control middleware factory.
 *
 * Rules:
 *  • `hr` and `admin` roles bypass ALL permission checks (superusers).
 *  • `mgr` role is allowed unless the slug requires `roles:` or `settings:`.
 *  • `emp` role is allowed only for `:read` slugs or `leaves:write`.
 *  • Any role not explicitly matched is denied.
 *
 * In production replace the inline role-check with a DB/Redis permission
 * cache lookup (see rbac.middleware.ts for the full RBAC implementation).
 *
 * Usage:
 *   router.delete('/:id', authenticate, authorize('employees:delete'), handler);
 *   router.get('/',       authenticate, authorize('employees:read'),   handler);
 *   router.get('/',       authenticate, authorize(),                   handler); // any authenticated
 */
export function authorize(...permissionSlugs: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized: No authenticated user found', 401);
      return;
    }

    const { roleSlug, isSuperAdmin } = req.user;

    // Superusers bypass all checks
    if (isSuperAdmin || roleSlug === 'hr' || roleSlug === 'admin') {
      next();
      return;
    }

    // No specific slugs required → any authenticated user passes
    if (permissionSlugs.length === 0) {
      next();
      return;
    }

    // Manager: allowed everything except roles/settings management
    if (roleSlug === 'mgr') {
      const blocked = permissionSlugs.some(
        (s) => s.startsWith('roles:') || s.startsWith('settings:'),
      );
      if (!blocked) { next(); return; }
      sendError(res, 'Forbidden: Managers cannot manage roles or system settings', 403);
      return;
    }

    // Employee: read-only + leave apply
    if (roleSlug === 'emp') {
      const allowed = permissionSlugs.every(
        (s) => s.endsWith(':read') || s === 'leaves:write',
      );
      if (allowed) { next(); return; }
      sendError(res, 'Forbidden: Employees have read-only access', 403);
      return;
    }

    // Unknown role → deny
    sendError(res, `Forbidden: Role "${roleSlug}" does not have access to this resource`, 403);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireRole
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Hard role gate — only the listed role slugs may pass.
 *
 * Use when a route is structurally off-limits to certain roles regardless
 * of permission slugs (e.g. payroll approval, sensitive statutory data).
 *
 * Usage:
 *   router.post('/runs', authenticate, requireRole('hr', 'admin'), handler);
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }
    if (roles.includes(req.user.roleSlug)) {
      next();
      return;
    }
    sendError(
      res,
      `Forbidden: This action requires one of the following roles: ${roles.join(', ')}`,
      403,
    );
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// selfOrAdmin
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Ensures a user can only access their own resource.
 * HR, Admin, and Manager roles always pass through.
 * An Employee passes only if `req.user.userId === resourceId` (from :id or :employeeId param).
 *
 * Usage:
 *   router.get('/:id/payslips', authenticate, selfOrAdmin, handler);
 */
export function selfOrAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { roleSlug, userId } = req.user;

  // Privileged roles pass unconditionally
  if (roleSlug === 'hr' || roleSlug === 'admin' || roleSlug === 'mgr') {
    next();
    return;
  }

  // Employee: must match their own resource ID
  const resourceId = parseInt(req.params.employeeId ?? req.params.id ?? '', 10);
  if (!isNaN(resourceId) && userId === resourceId) {
    next();
    return;
  }

  sendError(res, 'Forbidden: You can only access your own data', 403);
}
