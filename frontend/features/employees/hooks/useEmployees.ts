import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../../../services/api/employee.service';
import { showToast } from '../../../utils/toast';
import type { Employee, EmployeeQueryParams } from '../types/employee.types';

const KEYS = {
  all: ['employees'] as const,
  list: (p?: EmployeeQueryParams) => ['employees', 'list', p] as const,
  detail: (id: number) => ['employees', id] as const,
  summary: ['employees', 'summary'] as const,
  nextCode: ['employees', 'next-code'] as const,
};

// ─── List ─────────────────────────────────────────────────────────────────────
export function useEmployees(params?: EmployeeQueryParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => employeeService.getAll(params),
    staleTime: 30_000,
    select: (res) => ({ data: res.data, meta: res.meta! }),
  });
}

// ─── Single ───────────────────────────────────────────────────────────────────
export function useEmployee(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => employeeService.getById(id),
    enabled: !!id && id > 0,
    staleTime: 30_000,
    select: (res) => res.data,
  });
}

// ─── Summary stats ────────────────────────────────────────────────────────────
export function useEmployeeSummary() {
  return useQuery({
    queryKey: KEYS.summary,
    queryFn: () => employeeService.getSummary(),
    staleTime: 60_000,
    select: (res) => res.data,
  });
}

// ─── Auto-code ────────────────────────────────────────────────────────────────
export function useNextEmployeeCode() {
  return useQuery({
    queryKey: KEYS.nextCode,
    queryFn: () => employeeService.getNextCode(),
    staleTime: 0, // always fresh
    select: (res) => res.data.code,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────
export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Employee>) => employeeService.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      showToast(`✓ ${res.data.first_name} ${res.data.last_name} added successfully`);
    },
    onError: (err: any) => showToast(err?.message || 'Failed to create employee'),
  });
}

// ─── Full update ──────────────────────────────────────────────────────────────
export function useUpdateEmployee(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Employee>) => employeeService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: KEYS.all });
      showToast('✓ Employee updated');
    },
    onError: (err: any) => showToast(err?.message || 'Update failed'),
  });
}

// ─── Step patch (wizard) ──────────────────────────────────────────────────────
export function usePatchEmployeeStep(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ step, data }: { step: 'basic' | 'employment' | 'address' | 'statutory' | 'bank'; data: object }) =>
      employeeService.patchStep(id, step, data),
    onSuccess: (res, vars) => {
      qc.setQueryData(KEYS.detail(id), (old: any) =>
        old ? { ...old, data: { ...old.data, ...res.data } } : old,
      );
      showToast(`✓ ${vars.step} details saved`);
    },
    onError: (err: any) => showToast(err?.message || 'Save failed'),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeeService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      showToast('Employee removed');
    },
    onError: (err: any) => showToast(err?.message || 'Delete failed'),
  });
}

// ─── Avatar upload ────────────────────────────────────────────────────────────
export function useUploadAvatar(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => employeeService.uploadAvatar(id, file),
    onSuccess: (res) => {
      qc.setQueryData(KEYS.detail(id), (old: any) =>
        old ? { ...old, data: { ...old.data, avatar_url: res.data.avatar_url } } : old,
      );
      showToast('✓ Photo updated');
    },
    onError: (err: any) => showToast(err?.message || 'Upload failed'),
  });
}
