import apiClient from './client';
import type { ApiResponse } from '../../types/api.types';
import type {
  Role, HrModule, FormDefinition, DynamicField,
  PermissionMatrixResponse, SystemPermission,
  CreateRoleDto, UpdateRoleDto,
  CreateModuleDto, UpdateModuleDto,
  CreateFormDto, UpdateFormDto,
  CreateFieldDto, SetPermissionDto, BulkPermissionDto,
} from '../../features/rbac/types/rbac.types';

const base = '/rbac';

export const rbacService = {
  // ─── Roles ──────────────────────────────────────────────────────────────────
  listRoles:        () => apiClient.get<unknown, ApiResponse<Role[]>>(`${base}/roles`),
  createRole:       (data: CreateRoleDto) => apiClient.post<unknown, ApiResponse<Role>>(`${base}/roles`, data),
  updateRole:       (id: number, data: UpdateRoleDto) => apiClient.put<unknown, ApiResponse<Role>>(`${base}/roles/${id}`, data),
  deleteRole:       (id: number) => apiClient.delete<unknown, ApiResponse<{deleted:boolean}>>(`${base}/roles/${id}`),
  getRolePerms:     (id: number) => apiClient.get<unknown, ApiResponse<string[]>>(`${base}/roles/${id}/permissions`),
  setRolePerms:     (id: number, slugs: string[]) => apiClient.put<unknown, ApiResponse<{updated:boolean}>>(`${base}/roles/${id}/permissions`, { slugs }),
  getRoleMembers:   (id: number) => apiClient.get<unknown, ApiResponse<any[]>>(`${base}/roles/${id}/members`),
  assignMember:     (id: number, userId: number) => apiClient.post<unknown, ApiResponse<any>>(`${base}/roles/${id}/members`, { user_id: userId }),
  removeMember:     (id: number, userId: number) => apiClient.delete<unknown, ApiResponse<any>>(`${base}/roles/${id}/members/${userId}`),
  allSystemPerms:   () => apiClient.get<unknown, ApiResponse<SystemPermission[]>>(`${base}/permissions`),

  // ─── Modules ────────────────────────────────────────────────────────────────
  listModules:   () => apiClient.get<unknown, ApiResponse<HrModule[]>>(`${base}/modules`),
  createModule:  (data: CreateModuleDto) => apiClient.post<unknown, ApiResponse<HrModule>>(`${base}/modules`, data),
  updateModule:  (id: number, data: UpdateModuleDto) => apiClient.put<unknown, ApiResponse<HrModule>>(`${base}/modules/${id}`, data),
  deleteModule:  (id: number) => apiClient.delete<unknown, ApiResponse<any>>(`${base}/modules/${id}`),

  // ─── Forms ──────────────────────────────────────────────────────────────────
  listForms:    (moduleId: number) => apiClient.get<unknown, ApiResponse<FormDefinition[]>>(`${base}/modules/${moduleId}/forms`),
  getForm:      (formId: number) => apiClient.get<unknown, ApiResponse<FormDefinition>>(`${base}/forms/${formId}`),
  createForm:   (moduleId: number, data: CreateFormDto) => apiClient.post<unknown, ApiResponse<FormDefinition>>(`${base}/modules/${moduleId}/forms`, data),
  updateForm:   (formId: number, data: UpdateFormDto) => apiClient.put<unknown, ApiResponse<FormDefinition>>(`${base}/forms/${formId}`, data),
  deleteForm:   (formId: number) => apiClient.delete<unknown, ApiResponse<any>>(`${base}/forms/${formId}`),
  reorderFields:(formId: number, order: {id:number;sort_order:number}[]) => apiClient.put<unknown, ApiResponse<any>>(`${base}/forms/${formId}/reorder`, { order }),

  // ─── Fields ─────────────────────────────────────────────────────────────────
  createField:  (formId: number, data: CreateFieldDto) => apiClient.post<unknown, ApiResponse<DynamicField>>(`${base}/forms/${formId}/fields`, data),
  updateField:  (fieldId: number, data: Partial<CreateFieldDto>) => apiClient.put<unknown, ApiResponse<DynamicField>>(`${base}/fields/${fieldId}`, data),
  deleteField:  (fieldId: number) => apiClient.delete<unknown, ApiResponse<any>>(`${base}/fields/${fieldId}`),

  // ─── Permissions ────────────────────────────────────────────────────────────
  getMatrix:    (formId: number) => apiClient.get<unknown, ApiResponse<PermissionMatrixResponse>>(`${base}/forms/${formId}/permission-matrix`),
  setPermission:(fieldId: number, data: SetPermissionDto) => apiClient.put<unknown, ApiResponse<any>>(`${base}/fields/${fieldId}/permissions`, data),
  bulkPermissions:(data: BulkPermissionDto) => apiClient.post<unknown, ApiResponse<any>>(`${base}/permissions/bulk`, data),
  resolveForm:  (formId: number) => apiClient.get<unknown, ApiResponse<DynamicField[]>>(`${base}/forms/${formId}/resolve`),
};
