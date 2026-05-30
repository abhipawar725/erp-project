import { Request, Response, NextFunction } from 'express';
import { UserPermissionsService }           from './userPermissions.service';
import { sendResponse, sendError }          from '../../utils/response';
import { SYSTEM_MODULES, MODULE_FIELDS, FIELD_LABELS } from '../../database/models/UserPermission';

const svc = new UserPermissionsService();

// ─── Get the current user's own permissions (used by frontend on login) ───────
export async function getMyPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, companyId } = req.user!;
    const [modulePerms, ...allFieldPerms] = await Promise.all([
      svc.getModulePerms(userId, companyId),
      ...SYSTEM_MODULES.map(m => svc.getFieldPerms(userId, companyId, m as any)),
    ]);

    const fieldPermsByModule: Record<string, any[]> = {};
    SYSTEM_MODULES.forEach((m, i) => { fieldPermsByModule[m] = allFieldPerms[i]; });

    sendResponse(res, { data: { modules: modulePerms, fields: fieldPermsByModule } });
  } catch(e) { next(e); }
}

// ─── Get permissions for a specific module (used when entering a page) ────────
export async function getMyModuleFieldPerms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, companyId } = req.user!;
    const module = req.params.module as any;
    if (!SYSTEM_MODULES.includes(module)) { sendError(res, 'Invalid module', 400); return; }
    const fields = await svc.getFieldPerms(userId, companyId, module);
    sendResponse(res, { data: fields });
  } catch(e) { next(e); }
}

// ─── ADMIN: list all users with permission summary ────────────────────────────
export async function listUsersPerms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.listUsersWithPerms(req.user!.companyId) }); }
  catch(e) { next(e); }
}

// ─── ADMIN: get full permission config for a user ─────────────────────────────
export async function getUserPerms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetId  = parseInt(req.params.userId, 10);
    const companyId = req.user!.companyId;
    const [modulePerms, ...allFieldPerms] = await Promise.all([
      svc.getModulePerms(targetId, companyId),
      ...SYSTEM_MODULES.map(m => svc.getFieldPerms(targetId, companyId, m as any)),
    ]);
    const fieldPermsByModule: Record<string, any[]> = {};
    SYSTEM_MODULES.forEach((m, i) => { fieldPermsByModule[m] = allFieldPerms[i]; });
    sendResponse(res, { data: { modules: modulePerms, fields: fieldPermsByModule } });
  } catch(e) { next(e); }
}

// ─── ADMIN: set module permissions for a user ─────────────────────────────────
export async function setUserModulePerms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.setModulePerms(
      parseInt(req.params.userId, 10), req.user!.companyId,
      req.body.permissions, req.user!.userId,
    );
    sendResponse(res, { data, message: 'Module permissions saved' });
  } catch(e) { next(e); }
}

// ─── ADMIN: set field permissions for a user + module ─────────────────────────
export async function setUserFieldPerms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.setFieldPerms(
      parseInt(req.params.userId, 10), req.user!.companyId,
      req.params.module as any, req.body.fields, req.user!.userId,
    );
    sendResponse(res, { data, message: 'Field permissions saved' });
  } catch(e) { next(e); }
}

// ─── ADMIN: copy permissions from one user to another ─────────────────────────
export async function copyUserPerms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.copyPerms(
      parseInt(req.body.from_user_id, 10),
      parseInt(req.params.userId, 10),
      req.user!.companyId,
      req.user!.userId,
    );
    sendResponse(res, { data, message: 'Permissions copied' });
  } catch(e) { next(e); }
}

// ─── Get module field registry (for admin UI) ─────────────────────────────────
export async function getModuleFieldRegistry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = SYSTEM_MODULES.map(module => ({
      module,
      fields: (MODULE_FIELDS[module] || []).map(f => ({
        field_name: f,
        label: FIELD_LABELS[f] || f,
      })),
    }));
    sendResponse(res, { data: result });
  } catch(e) { next(e); }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

import { Router }   from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';

export const userPermissionsRouter = Router();
userPermissionsRouter.use(authenticate);

// Current user's own permissions (loaded on every page)
userPermissionsRouter.get('/me',                              getMyPermissions);
userPermissionsRouter.get('/me/fields/:module',              getMyModuleFieldPerms);

// Admin routes
userPermissionsRouter.get('/users',                          listUsersPerms);
userPermissionsRouter.get('/users/:userId',                  getUserPerms);
userPermissionsRouter.put('/users/:userId/modules',          [body('permissions').isArray()], validate, setUserModulePerms);
userPermissionsRouter.put('/users/:userId/fields/:module',   [body('fields').isArray()],      validate, setUserFieldPerms);
userPermissionsRouter.post('/users/:userId/copy',            [body('from_user_id').isInt()],  validate, copyUserPerms);

// Field registry (used by admin UI to build permission matrix)
userPermissionsRouter.get('/registry',                       getModuleFieldRegistry);
