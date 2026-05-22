import apiClient from '../../services/api/client';
import type { ApiResponse } from '../../types/api.types';
import type { Candidate, CandidateStats, CreateCandidateDto, UpdateCandidateDto, CandidateQueryParams, BulkUploadResult, CandidateStatus } from './types/candidate.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const candidateService = {
  getAll:    (params?: CandidateQueryParams) => apiClient.get<unknown, ApiResponse<Candidate[]> & { meta: any }>('/candidates', { params }),
  getStats:  ()                              => apiClient.get<unknown, ApiResponse<CandidateStats>>('/candidates/stats'),
  getById:   (id: number)                   => apiClient.get<unknown, ApiResponse<Candidate>>(`/candidates/${id}`),
  create:    (data: CreateCandidateDto)      => apiClient.post<unknown, ApiResponse<Candidate>>('/candidates', data),
  update:    (id: number, data: UpdateCandidateDto) => apiClient.put<unknown, ApiResponse<Candidate>>(`/candidates/${id}`, data),
  moveStatus:(id: number, status: CandidateStatus, remarks?: string) => apiClient.patch<unknown, ApiResponse<Candidate>>(`/candidates/${id}/status`, { status, remarks }),
  delete:    (id: number)                   => apiClient.delete<unknown, ApiResponse<null>>(`/candidates/${id}`),

  scheduleInterview: (id: number, data: { interview_date: string; interview_time: string; interview_type: string; interview_link?: string; interview_instructions?: string }) =>
    apiClient.patch<unknown, ApiResponse<Candidate>>(`/candidates/${id}/interview`, data),

  handleReschedule: (id: number, decision: 'Approved' | 'Rejected', new_date?: string, new_time?: string) =>
    apiClient.patch<unknown, ApiResponse<Candidate>>(`/candidates/${id}/reschedule-decision`, { decision, new_date, new_time }),

  grantPortalAccess: (id: number, password?: string) =>
    apiClient.patch<unknown, ApiResponse<{ is_portal_user: boolean }>>(`/candidates/${id}/portal-access`, { password }),

  uploadResume: (id: number, file: File) => {
    const form = new FormData(); form.append('resume', file);
    return apiClient.post<unknown, ApiResponse<{ resume_url: string }>>(`/candidates/${id}/resume`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  bulkUpload: (file: File) => {
    const form = new FormData(); form.append('file', file);
    return apiClient.post<unknown, ApiResponse<BulkUploadResult>>('/candidates/bulk', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ─── Portal service (uses different cookie-based auth) ────────────────────────
export const portalService = {
  login:       (email: string, password: string, company_id?: number) =>
    apiClient.post<unknown, ApiResponse<{ token: string; candidateId: number; name: string }>>('/candidates/portal/login', { email, password, company_id: company_id || 1 }),

  magicLink:   (email: string, company_id?: number) =>
    apiClient.post<unknown, ApiResponse<{ magicToken?: string } | null>>('/candidates/portal/magic-link', { email, company_id: company_id || 1 }),

  verifyMagic: (token: string, company_id?: number) =>
    apiClient.post<unknown, ApiResponse<{ token: string; candidateId: number; name: string }>>('/candidates/portal/verify-magic', { token, company_id: company_id || 1 }),

  getProfile:  () =>
    apiClient.get<unknown, ApiResponse<Candidate>>('/candidates/portal/profile'),

  respondInterview: (accepted: boolean) =>
    apiClient.post<unknown, ApiResponse<Candidate>>('/candidates/portal/interview-response', { accepted }),

  requestReschedule: (reason: string, proposed_date?: string, proposed_time?: string) =>
    apiClient.post<unknown, ApiResponse<Candidate>>('/candidates/portal/reschedule', { reason, proposed_date, proposed_time }),

  savePrejoin: (form_data: Record<string, unknown>, is_draft: boolean) =>
    apiClient.post<unknown, ApiResponse<Candidate>>('/candidates/portal/prejoin', { form_data, is_draft }),
};
