import apiClient from './client';

import type {
  Employee,
  EmployeeQueryParams,
} from '../../features/employees/types/employee.types';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const employeeService = {
  // List
  getAll: (
    params?: EmployeeQueryParams,
  ) =>
    apiClient.get<
      unknown,
      ApiResponse<Employee[]>
    >('/employees', {
      params,
    }),

  // Single
  getById: (id: number) =>
    apiClient.get<
      unknown,
      ApiResponse<Employee>
    >(`/employees/${id}`),

  // Auto-generate next code
  getNextCode: () =>
    apiClient.get<
      unknown,
      ApiResponse<{
        code: string;
      }>
    >('/employees/next-code'),

  // Summary stats
  getSummary: () =>
    apiClient.get<
      unknown,
      ApiResponse<{
        total: number;
        active: number;
        onProbation: number;
        left: number;
      }>
    >('/employees/summary'),

  // Managers list
  getManagers: () =>
    apiClient.get<
      unknown,
      ApiResponse<Employee[]>
    >('/employees/managers'),

  // Create
  create: (
    data: Partial<Employee>,
  ) =>
    apiClient.post<
      unknown,
      ApiResponse<Employee>
    >('/employees', data),

  // Full update
  update: (
    id: number,
    data: Partial<Employee>,
  ) =>
    apiClient.put<
      unknown,
      ApiResponse<Employee>
    >(`/employees/${id}`, data),

  // Wizard patch
  patchStep: (
    id: number,
    step:
      | 'basic'
      | 'employment'
      | 'address'
      | 'statutory'
      | 'bank',
    data: object,
  ) =>
    apiClient.patch<
      unknown,
      ApiResponse<Employee>
    >(
      `/employees/${id}/step/${step}`,
      data,
    ),

  // Delete
  delete: (id: number) =>
    apiClient.delete<
      unknown,
      ApiResponse<null>
    >(`/employees/${id}`),

  // Avatar upload
  uploadAvatar: (
    id: number,
    file: File,
  ) => {
    const form = new FormData();

    form.append(
      'avatar',
      file,
    );

    return apiClient.post<
      unknown,
      ApiResponse<{
        avatar_url: string;
      }>
    >(
      `/employees/${id}/avatar`,
      form,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      },
    );
  },
};