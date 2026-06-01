import { Request, Response, NextFunction } from 'express';
import { sendError} from '../../utils/response';

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
  if (!req.user?.isSuperAdmin) {
    sendError(res, 'Forbidden: Super admin access required', 403);
    return;
  }
  next();
}