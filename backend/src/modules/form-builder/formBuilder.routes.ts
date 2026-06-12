import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate }    from '../../middleware/validate.middleware';
import { authenticate } from '../../modules/auth/auth.middleware';
import { authorize } from '../../modules/auth/auth.middleware';
import {
  listRoles, createRole, updateRole, deleteRole,
  getRolePermissions, setRolePermissions,
  getRoleMembers, assignMember, removeMember,
  listAllPermissions,
  listModules, createModule, updateModule, deleteModule,
  listForms, getForm, createForm, updateForm, deleteForm,
  createField, updateField, deleteField, reorderFields,
  getPermissionMatrix, setFieldPermission, bulkSetPermissions, resolveFormPermissions,
} from './formBuilder.controller';
import { DynamicSourceService } from './dynamicSource.service';
const dynSvc = new DynamicSourceService();


const router = Router();
router.use(authenticate);

// ─── Roles ────────────────────────────────────────────────────────────────────
router.get   ('/roles', authorize('settings:view'), listRoles);
router.post  ('/roles', authorize('settings:edit'), [body('name').trim().notEmpty()], validate, createRole);
router.put   ('/roles/:id', authorize('settings:edit'), [param('id').isInt()], validate, updateRole);
router.delete('/roles/:id', authorize('settings:delete'), [param('id').isInt()], validate, deleteRole);
router.get   ('/roles/:id/permissions', authorize('settings:view'), [param('id').isInt()], validate, getRolePermissions);
router.put   ('/roles/:id/permissions', authorize('settings:edit'), [param('id').isInt(), body('slugs').isArray()], validate, setRolePermissions);
router.get   ('/roles/:id/members', authorize('settings:view'), [param('id').isInt()], validate, getRoleMembers);
router.post  ('/roles/:id/members', authorize('settings:edit'), [param('id').isInt(), body('user_id').isInt()], validate, assignMember);
router.delete('/roles/:id/members/:userId', authorize('settings:delete'), [param('id').isInt(), param('userId').isInt()], validate, removeMember);
router.get   ('/permissions', authorize('settings:view'), listAllPermissions);

// ─── Modules ──────────────────────────────────────────────────────────────────
router.get   ('/modules', authorize('settings:view'), listModules);
router.post  ('/modules', authorize('settings:edit'), [body('name').trim().notEmpty()], validate, createModule);
router.put   ('/modules/:id', authorize('settings:edit'), [param('id').isInt()], validate, updateModule);
router.delete('/modules/:id', authorize('settings:delete'), [param('id').isInt()], validate, deleteModule);

// ─── Forms ────────────────────────────────────────────────────────────────────
router.get   ('/modules/:moduleId/forms', authorize('settings:view'), [param('moduleId').isInt()], validate, listForms);
router.post  ('/modules/:moduleId/forms', authorize('settings:edit'), [param('moduleId').isInt(), body('name').trim().notEmpty()], validate, createForm);
router.get   ('/forms/:formId', authorize('settings:view'), [param('formId').isInt()], validate, getForm);
router.put   ('/forms/:formId', authorize('settings:edit'), [param('formId').isInt()], validate, updateForm);
router.delete('/forms/:formId', authorize('settings:delete'), [param('formId').isInt()], validate, deleteForm);
router.put   ('/forms/:formId/reorder', authorize('settings:edit'), [param('formId').isInt(), body('order').isArray()], validate, reorderFields);

// ─── Fields ───────────────────────────────────────────────────────────────────
router.post  ('/forms/:formId/fields',         [param('formId').isInt(), body('label').trim().notEmpty(), body('field_type').notEmpty()], validate, createField);
router.put   ('/fields/:fieldId',              [param('fieldId').isInt()], validate, updateField);
router.delete('/fields/:fieldId',              [param('fieldId').isInt()], validate, deleteField);

// ─── Field Permissions ────────────────────────────────────────────────────────
router.get   ('/forms/:formId/permission-matrix',   [param('formId').isInt()], validate, getPermissionMatrix);
router.put   ('/fields/:fieldId/permissions',        [param('fieldId').isInt(), body('role_id').isInt()], validate, setFieldPermission);
router.post  ('/permissions/bulk',                   [body('role_id').isInt(), body('permissions').isArray()], validate, bulkSetPermissions);
router.get   ('/forms/:formId/resolve',              [param('formId').isInt()], validate, resolveFormPermissions);

router.get(
  '/dynamic-source/meta',
  authenticate,
  (_req, res) => {
    res.json({ success: true, data: DynamicSourceService.getSourceMeta() });
  },
);

router.get(
  '/dynamic-source/:source',
  authenticate,
  async (req, res, next) => {
    try {
      const { source } = req.params;
      const { label_field, value_field, filter } = req.query as any;
      const options = await dynSvc.resolve(
        source as any,
        req.user!.companyId,
        label_field,
        value_field,
        filter,
      );
      res.json({ success: true, data: options });
    } catch(e){ next(e); }
  },
);

export default router;
