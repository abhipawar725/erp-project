import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacService } from '../services/api/rbac.service';
import { showToast }   from '../utils/toast';
import type {
  CreateRoleDto, UpdateRoleDto, CreateModuleDto, UpdateModuleDto,
  CreateFormDto, UpdateFormDto, CreateFieldDto, SetPermissionDto, BulkPermissionDto,
} from '../features/rbac/types/rbac.types';

// ─── Query keys ──────────────────────────────────────────────────────────────

export const RBAC_KEYS = {
  roles:      ['rbac','roles']                      as const,
  role:       (id: number) => ['rbac','roles',id]   as const,
  rolePerms:  (id: number) => ['rbac','roles',id,'perms'] as const,
  roleMembers:(id: number) => ['rbac','roles',id,'members'] as const,
  modules:    ['rbac','modules']                    as const,
  forms:      (modId: number) => ['rbac','forms',modId] as const,
  form:       (formId: number) => ['rbac','form',formId] as const,
  matrix:     (formId: number) => ['rbac','matrix',formId] as const,
  systemPerms:['rbac','system-perms']               as const,
};

// ─── Roles ────────────────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery({ queryKey: RBAC_KEYS.roles, queryFn: () => rbacService.listRoles(), staleTime: 60_000, select: r => r.data });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleDto) => rbacService.createRole(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.roles }); showToast('✓ Role created'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useUpdateRole(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateRoleDto) => rbacService.updateRole(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.roles }); showToast('✓ Role updated'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rbacService.deleteRole(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.roles }); showToast('Role deleted'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useRolePermissions(id: number) {
  return useQuery({ queryKey: RBAC_KEYS.rolePerms(id), queryFn: () => rbacService.getRolePerms(id), enabled: id > 0, select: r => r.data });
}

export function useSetRolePermissions(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slugs: string[]) => rbacService.setRolePerms(id, slugs),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.rolePerms(id) }); showToast('✓ Permissions saved'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useRoleMembers(id: number) {
  return useQuery({ queryKey: RBAC_KEYS.roleMembers(id), queryFn: () => rbacService.getRoleMembers(id), enabled: id > 0, select: r => r.data });
}

export function useAssignMember(roleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => rbacService.assignMember(roleId, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.roleMembers(roleId) }); showToast('✓ Member assigned'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useRemoveMember(roleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => rbacService.removeMember(roleId, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.roleMembers(roleId) }); showToast('Member removed'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useSystemPermissions() {
  return useQuery({ queryKey: RBAC_KEYS.systemPerms, queryFn: () => rbacService.allSystemPerms(), staleTime: 5 * 60_000, select: r => r.data });
}

// ─── Modules ─────────────────────────────────────────────────────────────────

export function useModules() {
  return useQuery({ queryKey: RBAC_KEYS.modules, queryFn: () => rbacService.listModules(), staleTime: 2 * 60_000, select: r => r.data });
}

export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateModuleDto) => rbacService.createModule(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.modules }); showToast('✓ Module created'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useUpdateModule(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateModuleDto) => rbacService.updateModule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.modules }); showToast('✓ Module updated'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rbacService.deleteModule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.modules }); showToast('Module deleted'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

// ─── Forms ───────────────────────────────────────────────────────────────────

export function useForms(moduleId: number) {
  return useQuery({ queryKey: RBAC_KEYS.forms(moduleId), queryFn: () => rbacService.listForms(moduleId), enabled: moduleId > 0, staleTime: 60_000, select: r => r.data });
}

export function useForm(formId: number) {
  return useQuery({ queryKey: RBAC_KEYS.form(formId), queryFn: () => rbacService.getForm(formId), enabled: formId > 0, staleTime: 60_000, select: r => r.data });
}

export function useCreateForm(moduleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFormDto) => rbacService.createForm(moduleId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.forms(moduleId) }); showToast('✓ Form created'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useUpdateForm(formId: number, moduleId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateFormDto) => rbacService.updateForm(formId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RBAC_KEYS.form(formId) });
      if (moduleId) qc.invalidateQueries({ queryKey: RBAC_KEYS.forms(moduleId) });
      showToast('✓ Form updated');
    },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useDeleteForm(moduleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: number) => rbacService.deleteForm(formId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.forms(moduleId) }); showToast('Form deleted'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

// ─── Fields ──────────────────────────────────────────────────────────────────

export function useCreateField(formId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFieldDto) => rbacService.createField(formId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.form(formId) }); showToast('✓ Field added'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useUpdateField(formId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: number; data: Partial<CreateFieldDto> }) => rbacService.updateField(fieldId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.form(formId) }); showToast('✓ Field updated'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useDeleteField(formId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fieldId: number) => rbacService.deleteField(fieldId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.form(formId) }); showToast('Field deleted'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}

export function useReorderFields(formId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: {id:number;sort_order:number}[]) => rbacService.reorderFields(formId, order),
    onSuccess: () => { qc.invalidateQueries({ queryKey: RBAC_KEYS.form(formId) }); },
  });
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export function usePermissionMatrix(formId: number) {
  return useQuery({ queryKey: RBAC_KEYS.matrix(formId), queryFn: () => rbacService.getMatrix(formId), enabled: formId > 0, staleTime: 30_000, select: r => r.data });
}

export function useBulkSetPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkPermissionDto & { formId: number }) => rbacService.bulkPermissions({ role_id: data.role_id, permissions: data.permissions }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: RBAC_KEYS.matrix(vars.formId) });
      showToast('✓ Permissions saved');
    },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
}
