import { Request, Response, NextFunction } from 'express';
import { RolesService }       from '../roles/roles.service';
import { FormBuilderService } from './formBuilder.service';
import { sendResponse, sendError } from '../../utils/response';

const rolesSvc = new RolesService();
const fbSvc    = new FormBuilderService();

// ─────────────────────────────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────────────────────────────

export async function listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await rolesSvc.list(req.user!.companyId) }); } catch(e){ next(e); }
}

export async function createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await rolesSvc.create(req.user!.companyId, req.body, req.user!.userId), statusCode: 201 }); } catch(e){ next(e); }
}

export async function updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await rolesSvc.update(+req.params.id, req.user!.companyId, req.body, req.user!.userId) }); } catch(e){ next(e); }
}

export async function deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await rolesSvc.delete(+req.params.id, req.user!.companyId, req.user!.userId) }); } catch(e){ next(e); }
}

export async function getRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await rolesSvc.getPermissions(+req.params.id, req.user!.companyId) }); } catch(e){ next(e); }
}

export async function setRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await rolesSvc.setPermissions(+req.params.id, req.user!.companyId, req.body.slugs, req.user!.userId) }); } catch(e){ next(e); }
}

export async function getRoleMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await rolesSvc.getMembers(+req.params.id, req.user!.companyId) }); } catch(e){ next(e); }
}

export async function assignMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await rolesSvc.assignMember(+req.params.id, req.user!.companyId, req.body.user_id, req.user!.userId), statusCode: 201 }); } catch(e){ next(e); }
}

export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await rolesSvc.removeMember(+req.params.id, req.user!.companyId, +req.params.userId) }); } catch(e){ next(e); }
}

export async function listAllPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await rolesSvc.listAllPermissions() }); } catch(e){ next(e); }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULES
// ─────────────────────────────────────────────────────────────────────────────

export async function listModules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.listModules(req.user!.companyId) }); } catch(e){ next(e); }
}

export async function createModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.createModule(req.user!.companyId, req.body, req.user!.userId), statusCode: 201 }); } catch(e){ next(e); }
}

export async function updateModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.updateModule(+req.params.id, req.user!.companyId, req.body, req.user!.userId) }); } catch(e){ next(e); }
}

export async function deleteModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.deleteModule(+req.params.id, req.user!.companyId, req.user!.userId) }); } catch(e){ next(e); }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMS
// ─────────────────────────────────────────────────────────────────────────────

export async function listForms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.listForms(+req.params.moduleId, req.user!.companyId) }); } catch(e){ next(e); }
}

export async function getForm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.getFormWithFields(+req.params.formId, req.user!.companyId) }); } catch(e){ next(e); }
}

export async function createForm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.createForm(+req.params.moduleId, req.user!.companyId, req.body, req.user!.userId), statusCode: 201 }); } catch(e){ next(e); }
}

export async function updateForm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.updateForm(+req.params.formId, req.user!.companyId, req.body, req.user!.userId) }); } catch(e){ next(e); }
}

export async function deleteForm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.deleteForm(+req.params.formId, req.user!.companyId) }); } catch(e){ next(e); }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELDS
// ─────────────────────────────────────────────────────────────────────────────

export async function createField(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.createField(+req.params.formId, req.user!.companyId, req.body, req.user!.userId), statusCode: 201 }); } catch(e){ next(e); }
}

export async function updateField(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.updateField(+req.params.fieldId, req.user!.companyId, req.body, req.user!.userId) }); } catch(e){ next(e); }
}

export async function deleteField(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.deleteField(+req.params.fieldId, req.user!.companyId) }); } catch(e){ next(e); }
}

export async function reorderFields(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.reorderFields(+req.params.formId, req.user!.companyId, req.body.order) }); } catch(e){ next(e); }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getPermissionMatrix(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await fbSvc.getPermissionMatrix(req.user!.companyId, +req.params.formId) }); } catch(e){ next(e); }
}

export async function setFieldPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await fbSvc.setFieldPermission(req.user!.companyId, +req.body.role_id, +req.params.fieldId, req.body, req.user!.userId);
    sendResponse(res, { data });
  } catch(e){ next(e); }
}

export async function bulkSetPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await fbSvc.bulkSetFieldPermissions(req.user!.companyId, +req.body.role_id, req.body.permissions, req.user!.userId);
    sendResponse(res, { data, message: `${data.updated} permissions updated` });
  } catch(e){ next(e); }
}

export async function resolveFormPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roleId = req.user!.roleId || 0;
    const data = await fbSvc.resolveFormPermissions(+req.params.formId, roleId, req.user!.companyId);
    sendResponse(res, { data });
  } catch(e){ next(e); }
}
