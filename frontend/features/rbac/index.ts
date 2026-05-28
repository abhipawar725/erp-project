// Types
export * from './types/rbac.types';

// Validation engine
export { buildZodSchema, validateForm, buildDefaultValues, maskValue } from '../../utils/validationEngine';

// Service
export { rbacService } from '../../services/api/rbac.service';

// Hooks
export {
  RBAC_KEYS,
  useRoles, useCreateRole, useUpdateRole, useDeleteRole,
  useRolePermissions, useSetRolePermissions,
  useRoleMembers, useAssignMember, useRemoveMember,
  useSystemPermissions,
  useModules, useCreateModule, useUpdateModule, useDeleteModule,
  useForms, useForm, useCreateForm, useUpdateForm, useDeleteForm,
  useCreateField, useUpdateField, useDeleteField, useReorderFields,
  usePermissionMatrix, useBulkSetPermissions,
} from '../../hooks/useRbac';

// Components
export { DynamicForm, DynamicFormDisplay } from './components/DynamicForm';
