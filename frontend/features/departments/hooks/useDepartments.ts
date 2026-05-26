import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentService, type DepartmentQueryParams, type CreateDepartmentDto, type UpdateDepartmentDto } from '../../../services/api/department.service';
import { showToast } from '../../../utils/toast';

const KEYS = {
  all:    ['departments']                                      as const,
  list:   (p?: DepartmentQueryParams) => ['departments', 'list', p] as const,
  stats:  ['departments', 'stats']                             as const,
  detail: (id: number) => ['departments', id]                  as const,
};

// ─── List ─────────────────────────────────────────────────────────────────────
export function useDepartments(params?: DepartmentQueryParams) {
  return useQuery({
    queryKey:  KEYS.list(params),
    queryFn:   () => departmentService.getAll(params),
    staleTime: 2 * 60_000,
    select:    (res) => res.data,
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export function useDepartmentStats() {
  return useQuery({
    queryKey:  KEYS.stats,
    queryFn:   () => departmentService.getStats(),
    staleTime: 60_000,
    select:    (res) => res.data,
  });
}

// ─── Single ───────────────────────────────────────────────────────────────────
export function useDepartment(id: number) {
  return useQuery({
    queryKey:  KEYS.detail(id),
    queryFn:   () => departmentService.getById(id),
    enabled:   !!id && id > 0,
    staleTime: 60_000,
    select:    (res) => res.data,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────
export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentDto) => departmentService.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      showToast(`✓ Department "${res.data.name}" created`);
    },
    onError: (err: any) => showToast(err?.message || 'Failed to create department'),
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────
export function useUpdateDepartment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateDepartmentDto) => departmentService.update(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.setQueryData(KEYS.detail(id), res);
      showToast(`✓ "${res.data.name}" updated`);
    },
    onError: (err: any) => showToast(err?.message || 'Update failed'),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => departmentService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      showToast('Department deleted');
    },
    onError: (err: any) => showToast(err?.message || 'Delete failed'),
  });
}

// ─── Dropdown helper ──────────────────────────────────────────────────────────
export function useDepartmentOptions() {
  const query = useDepartments();

  return {
    ...query,
    data: (query.data || []).map((d) => ({
      value: d.id,
      label: d.name,
      code: d.code
    }))
  };
}
