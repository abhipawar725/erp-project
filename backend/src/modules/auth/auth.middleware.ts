import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../utils/jwt';
import { sendError } from '../../utils/response';
import { JwtPayload } from '../../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ─── authenticate ─────────────────────────────────────────────────────────────
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Unauthorized: Authorization header missing or malformed', 401);
      return;
    }
    req.user = verifyAccessToken(authHeader.slice(7));
    next();
  } catch (err: any) {
    const msg = err?.name === 'TokenExpiredError'
      ? 'Unauthorized: Token has expired'
      : 'Unauthorized: Invalid token';
    sendError(res, msg, 401);
  }
}

// ─── authorize ────────────────────────────────────────────────────────────────
export function authorize(...slugs: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { sendError(res, 'Unauthorized', 401); return; }

    // Super admin bypasses everything
    if (req.user.isSuperAdmin) { next(); return; }

    // No slug restriction = any authenticated user
    if (slugs.length === 0) { next(); return; }

    // HR / Admin full access within their company
    if (req.user.roleSlug === 'hr' || req.user.roleSlug === 'admin') { next(); return; }

    // Check slugs from JWT permissions array
    const userPerms = req.user.permissions ?? [];
    const allowed = slugs.some(slug => userPerms.includes(slug));
    if (allowed) { next(); return; }

    sendError(res, `Forbidden: Missing permission (${slugs.join(' or ')})`, 403);
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  if (!req.user.isSuperAdmin) {
    sendError(res, 'Forbidden: Super admin access required', 403);
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
    if (req.user.isSuperAdmin) { next(); return; }
    if (roles.includes(req.user.roleSlug)) { next(); return; }
    sendError(res, `Forbidden: Requires role ${roles.join(' or ')}`, 403);
  };
}

// ─── selfOrAdmin ──────────────────────────────────────────────────────────────
export function selfOrAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const { roleSlug, userId, isSuperAdmin } = req.user;
  if (isSuperAdmin || roleSlug === 'hr' || roleSlug === 'admin' || roleSlug === 'mgr') {
    next(); return;
  }
  const rid = parseInt(req.params.employeeId ?? req.params.id ?? '', 10);
  if (!isNaN(rid) && userId === rid) { next(); return; }
  sendError(res, 'Forbidden: You can only access your own data', 403);
}
