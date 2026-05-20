import apiClient from './client';
import type { ApiResponse } from '../../types/api.types';
import type {
  Designation,
  CreateDesignationDto,
  UpdateDesignationDto,
  DesignationQueryParams,
} from '../../features/designations/types/designation.types';

export const designationService = {
  // GET /api/designations?department_id=1&is_active=true&search=eng
  getAll: (params?: DesignationQueryParams) =>
    apiClient.get<unknown, ApiResponse<Designation[]>>('/designations', { params }),

  // GET /api/designations/:id  (includes employees list)
  getById: (id: number) =>
    apiClient.get<unknown, ApiResponse<Designation>>(`/designations/${id}`),

  // POST /api/designations
  create: (data: CreateDesignationDto) =>
    apiClient.post<unknown, ApiResponse<Designation>>('/designations', data),

  // PUT /api/designations/:id
  update: (id: number, data: UpdateDesignationDto) =>
    apiClient.put<unknown, ApiResponse<Designation>>(`/designations/${id}`, data),

  // DELETE /api/designations/:id
  delete: (id: number) =>
    apiClient.delete<unknown, ApiResponse<null>>(`/designations/${id}`),
};
