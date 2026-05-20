import apiClient from './client';
import type { ApiResponse } from '../../types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DepartmentHead {
  id:            number;
  first_name:    string;
  last_name:     string;
  avatar_url?:   string | null;
  designation_id?: number | null;
}

export interface DepartmentDesignation {
  id:     number;
  name:   string;
  grade?: string | null;
}

export interface DepartmentEmployee {
  id:             number;
  first_name:     string;
  last_name:      string;
  employee_code:  string;
  status:         string;
  avatar_url?:    string | null;
  designation_id?: number | null;
}

export interface DepartmentParent {
  id:    number;
  name:  string;
  code?: string | null;
}

export interface Department {
  id:              number;
  company_id:      number;
  name:            string;
  code?:           string | null;
  head_id?:        number | null;
  parent_id?:      number | null;
  is_active:       boolean;
  created_at?:     string;
  updated_at?:     string;
  employee_count?: number;
  // Associations
  head?:           DepartmentHead | null;
  designations?:   DepartmentDesignation[];
  employees?:      DepartmentEmployee[];
  parent?:         DepartmentParent | null;
  children?:       DepartmentParent[];
}

export interface DepartmentStats {
  total:            number;
  active:           number;
  inactive:         number;
  withHead:         number;
  withoutHead:      number;
  largestDeptId:    number | null;
  largestDeptCount: number;
}

export interface CreateDepartmentDto {
  name:       string;
  code?:      string;
  head_id?:   number | null;
  parent_id?: number | null;
}

export interface UpdateDepartmentDto {
  name?:      string;
  code?:      string;
  head_id?:   number | null;
  parent_id?: number | null;
  is_active?: boolean;
}

export interface DepartmentQueryParams {
  search?:    string;
  is_active?: 'true' | 'false' | 'all';
  parent_id?: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const departmentService = {
  getAll: (params?: DepartmentQueryParams) =>
    apiClient.get<unknown, ApiResponse<Department[]>>('/departments', { params }),

  getStats: () =>
    apiClient.get<unknown, ApiResponse<DepartmentStats>>('/departments/stats'),

  getById: (id: number) =>
    apiClient.get<unknown, ApiResponse<Department>>(`/departments/${id}`),

  create: (data: CreateDepartmentDto) =>
    apiClient.post<unknown, ApiResponse<Department>>('/departments', data),

  update: (id: number, data: UpdateDepartmentDto) =>
    apiClient.put<unknown, ApiResponse<Department>>(`/departments/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<unknown, ApiResponse<null>>(`/departments/${id}`),
};
