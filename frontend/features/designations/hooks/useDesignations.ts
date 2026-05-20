import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designationService } from '../../../services/api/designation.service';
import { showToast }          from '../../../utils/toast';
import type {
  CreateDesignationDto,
  UpdateDesignationDto,
  DesignationQueryParams,
} from '../types/designation.types';

// ─── Query key factory ────────────────────────────────────────────────────────
const KEYS = {
  all:    ['designations']                                    as const,
  list:   (p?: DesignationQueryParams) => ['designations', 'list', p]  as const,
  detail: (id: number)                 => ['designations', id]          as const,
};

// ─── List ─────────────────────────────────────────────────────────────────────
export function useDesignations(params?: DesignationQueryParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn:  () => designationService.getAll(params),
    staleTime: 2 * 60_000,
    select:    (res) => res.data,
  });
}

// Convenience: designations for a specific department (used in dropdowns)
export function useDesignationsByDepartment(departmentId?: number) {
  return useDesignations(
    departmentId ? { department_id: departmentId } : undefined,
  );
}

// ─── Single ───────────────────────────────────────────────────────────────────
export function useDesignation(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn:  () => designationService.getById(id),
    enabled:  !!id && id > 0,
    staleTime: 60_000,
    select:    (res) => res.data,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────
export function useCreateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDesignationDto) => designationService.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      showToast(`✓ "${res.data.name}" designation created`);
    },
    onError: (err: any) => showToast(err?.message || 'Failed to create designation'),
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────
export function useUpdateDesignation(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateDesignationDto) => designationService.update(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.setQueryData(KEYS.detail(id), res);
      showToast(`✓ "${res.data.name}" updated`);
    },
    onError: (err: any) => showToast(err?.message || 'Failed to update designation'),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export function useDeleteDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => designationService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      showToast('Designation deleted');
    },
    onError: (err: any) => showToast(err?.message || 'Failed to delete designation'),
  });
}
