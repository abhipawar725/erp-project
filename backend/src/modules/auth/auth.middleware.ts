import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../../utils/jwt';
import { sendError } from '../../utils/response';

declare global {
  namespace Express {
    interface Request { user?: JwtPayload; }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) { sendError(res, 'Unauthorized: No token provided', 401); return; }
    const token = authHeader.split(' ')[1];
    req.user = verifyAccessToken(token);
    next();
  } catch { sendError(res, 'Unauthorized: Invalid or expired token', 401); }
}

export function authorize(...permissionSlugs: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
    if (['hr', 'admin'].includes(req.user.roleSlug)) { next(); return; }
    if (permissionSlugs.length === 0) { next(); return; }
    if (req.user.roleSlug === 'mgr' && !permissionSlugs.some(s => s.includes('roles:') || s.includes('settings:'))) { next(); return; }
    if (req.user.roleSlug === 'emp') {
      const ok = permissionSlugs.every(s => s.includes(':read') || s === 'leaves:write');
      if (ok) { next(); return; }
      sendError(res, 'Forbidden: Insufficient permissions', 403); return;
    }
    next();
  };
}

export function selfOrAdmin(req: Request, res: Response, next: NextFunction): void {
  const { user } = req;
  if (!user) { sendError(res, 'Unauthorized', 401); return; }
  const resourceId = parseInt(req.params.employeeId || req.params.id, 10);
  if (['hr', 'admin', 'mgr'].includes(user.roleSlug) || user.userId === resourceId) { next(); return; }
  sendError(res, 'Forbidden: You can only access your own data', 403);
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
    if (roles.includes(req.user.roleSlug)) { next(); return; }
    sendError(res, `Forbidden: Requires role: ${roles.join(' or ')}`, 403);
  };
}
