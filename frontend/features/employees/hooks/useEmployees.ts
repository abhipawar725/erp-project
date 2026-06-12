import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../../../services/api/employee.service';
import { showToast } from '../../../utils/toast';
import type { StepSchemaKey } from '../validations/employee.schema';

// ─── Query key factory ────────────────────────────────────────────────────────
export const EMP_KEYS = {
  all:           ['employees'] as const,
  lists:         () => [...EMP_KEYS.all, 'list'] as const,
  list:          (p: object) => [...EMP_KEYS.lists(), p] as const,
  detail:        (id: number) => [...EMP_KEYS.all, id] as const,
  summary:       ['employees', 'summary'] as const,
  nextCode:      ['employees', 'next-code'] as const,
  fieldPerms:    ['employees', 'field-permissions'] as const,
  draft:         (sid: string) => ['employees', 'draft', sid] as const,
};

// ─── List ─────────────────────────────────────────────────────────────────────
export function useEmployees(params?: object) {
  return useQuery({
    queryKey: EMP_KEYS.list(params ?? {}),
    queryFn: () => employeeService.getAll(params),
    staleTime: 30_000,
    select: (res: any) => ({ rows: res.data, meta: res.meta }),
  });
}

// ─── Single ───────────────────────────────────────────────────────────────────
export function useEmployee(id: number) {
  return useQuery({
    queryKey: EMP_KEYS.detail(id),
    queryFn: () => employeeService.getById(id),
    enabled: id > 0,
    staleTime: 30_000,
    select: (res: any) => res.data,
  });
}

// ─── Summary stats ────────────────────────────────────────────────────────────
export function useEmployeeSummary() {
  return useQuery({
    queryKey: EMP_KEYS.summary,
    queryFn: () => employeeService.summary(),
    staleTime: 60_000,
    select: (res: any) => res.data,
  });
}

// ─── Next auto code ───────────────────────────────────────────────────────────
export function useNextCode() {
  return useQuery({
    queryKey: EMP_KEYS.nextCode,
    queryFn: () => employeeService.nextCode(),
    staleTime: 0,
    select: (res: any) => res.data as { code: string; ref: string },
  });
}

// ─── Field permissions ────────────────────────────────────────────────────────
export function useFieldPermissions() {
  return useQuery({
    queryKey: EMP_KEYS.fieldPerms,
    queryFn: () => employeeService.fieldPermissions(),
    staleTime: 5 * 60_000,
    select: (res: any) => res.data as Record<string, { can_view: boolean; can_edit: boolean; is_masked: boolean; can_copy: boolean; can_download: boolean }>,
  });
}

// ─── Manager lookup by code ───────────────────────────────────────────────────
// Resolve a single manager by employee_id (integer FK — not employee_code)
export function useManagerById(managerId: number | null | undefined) {
  return useQuery({
    queryKey: ['employees', 'manager', managerId ?? 0],
    queryFn: () => employeeService.managerById(managerId!),
    enabled: !!managerId && managerId > 0,
    staleTime: 5 * 60_000,
    select: (res: any) => res.data as { id: number; employee_code: string; first_name: string; last_name: string; official_email?: string },
  });
}

// ─── Draft ────────────────────────────────────────────────────────────────────
export function useDraft(sessionId: string | null) {
  return useQuery({
    queryKey: EMP_KEYS.draft(sessionId ?? ''),
    queryFn: () => employeeService.getDraft(sessionId!),
    enabled: !!sessionId,
    staleTime: 0,
    select: (res: any) => res.data,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────
export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => employeeService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: EMP_KEYS.lists() }),
    onError: (err: any) => showToast(err?.message || 'Failed to create employee'),
  });
}

// ─── Step update ─────────────────────────────────────────────────────────────
export function useUpdateStep(employeeId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ step, data }: { step: StepSchemaKey; data: object }) =>
      employeeService.updateStep(employeeId, step, data),
    onSuccess: (res: any) => {
      qc.setQueryData(EMP_KEYS.detail(employeeId), (old: any) =>
        old ? { ...old, data: { ...old.data, ...res.data } } : old
      );
    },
    onError: (err: any) => showToast(err?.message || 'Save failed'),
  });
}

// ─── Save draft ───────────────────────────────────────────────────────────────
export function useSaveDraft() {
  return useMutation({
    mutationFn: (payload: { employee_id?: number | null; step: string; form_data: object; session_id: string }) =>
      employeeService.saveDraft(payload),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeeService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: EMP_KEYS.lists() }); showToast('Employee removed'); },
    onError: (err: any) => showToast(err?.message || 'Delete failed'),
  });
}

// ─── Bulk upload ──────────────────────────────────────────────────────────────
export function useBulkUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => employeeService.bulkUpload(file),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: EMP_KEYS.lists() });
      showToast(`${res.data?.success || 0} employees imported`);
    },
    onError: (err: any) => showToast(err?.message || 'Upload failed'),
  });
}