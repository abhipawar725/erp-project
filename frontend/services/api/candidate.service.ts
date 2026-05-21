import apiClient from './client';
import type { ApiResponse } from '../../types/api.types';
import type {
  Candidate, CandidateStats, CreateCandidateDto,
  UpdateCandidateDto, CandidateQueryParams, BulkUploadResult, CandidateStatus,
} from '../../features/candidates/types/candidate.types';

export const candidateService = {
  getAll: (params?: CandidateQueryParams) =>
    apiClient.get<unknown, ApiResponse<Candidate[]> & { meta: any }>(
      '/candidates', { params },
    ),

  getStats: () =>
    apiClient.get<unknown, ApiResponse<CandidateStats>>('/candidates/stats'),

  getById: (id: number) =>
    apiClient.get<unknown, ApiResponse<Candidate>>(`/candidates/${id}`),

  create: (data: CreateCandidateDto) =>
    apiClient.post<unknown, ApiResponse<Candidate>>('/candidates', data),

  update: (id: number, data: UpdateCandidateDto) =>
    apiClient.put<unknown, ApiResponse<Candidate>>(`/candidates/${id}`, data),

  moveStatus: (id: number, status: CandidateStatus, remarks?: string) =>
    apiClient.patch<unknown, ApiResponse<Candidate>>(`/candidates/${id}/status`, { status, remarks }),

  delete: (id: number) =>
    apiClient.delete<unknown, ApiResponse<null>>(`/candidates/${id}`),

  uploadResume: (id: number, file: File) => {
    const form = new FormData();
    form.append('resume', file);
    return apiClient.post<unknown, ApiResponse<{ resume_url: string }>>(
      `/candidates/${id}/resume`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  bulkUpload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<unknown, ApiResponse<BulkUploadResult>>(
      '/candidates/bulk', form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
};
