import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload, getEffectiveCompanyId } from '../../utils/jwt';
import { sendError } from '../../utils/response';

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

// ─── requireSuperAdmin ────────────────────────────────────────────────────────
// Only true super admins with NO active company switch.
// Used exclusively on /api/super/* management routes.
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  if (!req.user.isSuperAdmin) {
    sendError(res, 'Forbidden: Platform super admin access required', 403);
    return;
  }
  // Must NOT currently be in a company-switch session for management routes
  if (req.user.viewingCompanyId !== null) {
    sendError(res, 'Forbidden: Exit company view before accessing platform settings', 403);
    return;
  }
  next();
}

// ─── requireCompanyContext ────────────────────────────────────────────────────
// Passes for:
//   1. Regular company users (companyId set, isSuperAdmin false)
//   2. Super admin who has switched into a company (viewingCompanyId set)
//
// Injects req.user!.companyId = effective company so ALL existing services work
// without any changes — they all use req.user!.companyId.
export function requireCompanyContext(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }

  const effectiveId = getEffectiveCompanyId(req.user);

  if (!effectiveId) {
    if (req.user.isSuperAdmin) {
      sendError(res, 'Forbidden: Switch into a company before accessing company resources', 403);
    } else {
      sendError(res, 'Forbidden: No company context', 403);
    }
    return;
  }

  // ★ KEY: overwrite companyId so ALL downstream services use effectiveId
  req.user = { ...req.user, companyId: effectiveId };
  next();
}

// ─── authorize ────────────────────────────────────────────────────────────────
export function authorize(...permissionSlugs: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
    const { roleSlug, isSuperAdmin } = req.user;

    // Super admin bypasses all company permission checks
    if (isSuperAdmin) { next(); return; }
    if (permissionSlugs.length === 0) { next(); return; }
    if (roleSlug === 'hr' || roleSlug === 'admin') { next(); return; }

    if (roleSlug === 'mgr') {
      const blocked = permissionSlugs.some(s => s.startsWith('roles:') || s.startsWith('settings:'));
      if (!blocked) { next(); return; }
      sendError(res, 'Forbidden: Managers cannot manage roles or settings', 403);
      return;
    }

    if (roleSlug === 'emp') {
      const allowed = permissionSlugs.every(s => s.endsWith(':read') || s === 'leaves:write');
      if (allowed) { next(); return; }
      sendError(res, 'Forbidden: Employees have read-only access', 403);
      return;
    }

    sendError(res, `Forbidden: Role "${roleSlug}" does not have access`, 403);
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
    if (req.user.isSuperAdmin) { next(); return; }
    if (roles.includes(req.user.roleSlug)) { next(); return; }
    sendError(res, `Forbidden: Requires role: ${roles.join(', ')}`, 403);
  };
}

export function selfOrAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  const { roleSlug, userId, isSuperAdmin } = req.user;
  if (isSuperAdmin || roleSlug === 'hr' || roleSlug === 'admin' || roleSlug === 'mgr') { next(); return; }
  const rid = parseInt(req.params.employeeId ?? req.params.id ?? '', 10);
  if (!isNaN(rid) && userId === rid) { next(); return; }
  sendError(res, 'Forbidden: You can only access your own data', 403);
}
