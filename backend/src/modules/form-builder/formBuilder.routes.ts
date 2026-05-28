import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate }    from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize }   from '../../middleware/rbac.middleware';
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

const router = Router();
router.use(authenticate);

// ─── Roles ────────────────────────────────────────────────────────────────────
router.get   ('/roles',                    listRoles);
router.post  ('/roles',                    [body('name').trim().notEmpty()], validate, createRole);
router.put   ('/roles/:id',                [param('id').isInt()], validate, updateRole);
router.delete('/roles/:id',                [param('id').isInt()], validate, deleteRole);
router.get   ('/roles/:id/permissions',    [param('id').isInt()], validate, getRolePermissions);
router.put   ('/roles/:id/permissions',    [param('id').isInt(), body('slugs').isArray()], validate, setRolePermissions);
router.get   ('/roles/:id/members',        [param('id').isInt()], validate, getRoleMembers);
router.post  ('/roles/:id/members',        [param('id').isInt(), body('user_id').isInt()], validate, assignMember);
router.delete('/roles/:id/members/:userId',[param('id').isInt(), param('userId').isInt()], validate, removeMember);
router.get   ('/permissions',              listAllPermissions);

// ─── Modules ──────────────────────────────────────────────────────────────────
router.get   ('/modules',         listModules);
router.post  ('/modules',         [body('name').trim().notEmpty()], validate, createModule);
router.put   ('/modules/:id',     [param('id').isInt()], validate, updateModule);
router.delete('/modules/:id',     [param('id').isInt()], validate, deleteModule);

// ─── Forms ────────────────────────────────────────────────────────────────────
router.get   ('/modules/:moduleId/forms',      [param('moduleId').isInt()], validate, listForms);
router.post  ('/modules/:moduleId/forms',      [param('moduleId').isInt(), body('name').trim().notEmpty()], validate, createForm);
router.get   ('/forms/:formId',                [param('formId').isInt()], validate, getForm);
router.put   ('/forms/:formId',                [param('formId').isInt()], validate, updateForm);
router.delete('/forms/:formId',                [param('formId').isInt()], validate, deleteForm);
router.put   ('/forms/:formId/reorder',        [param('formId').isInt(), body('order').isArray()], validate, reorderFields);

// ─── Fields ───────────────────────────────────────────────────────────────────
router.post  ('/forms/:formId/fields',         [param('formId').isInt(), body('label').trim().notEmpty(), body('field_type').notEmpty()], validate, createField);
router.put   ('/fields/:fieldId',              [param('fieldId').isInt()], validate, updateField);
router.delete('/fields/:fieldId',              [param('fieldId').isInt()], validate, deleteField);

// ─── Field Permissions ────────────────────────────────────────────────────────
router.get   ('/forms/:formId/permission-matrix',   [param('formId').isInt()], validate, getPermissionMatrix);
router.put   ('/fields/:fieldId/permissions',        [param('fieldId').isInt(), body('role_id').isInt()], validate, setFieldPermission);
router.post  ('/permissions/bulk',                   [body('role_id').isInt(), body('permissions').isArray()], validate, bulkSetPermissions);
router.get   ('/forms/:formId/resolve',              [param('formId').isInt()], validate, resolveFormPermissions);

export default router;
