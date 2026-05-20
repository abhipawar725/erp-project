import apiClient from './client';
import { ApiResponse } from '../../types/api.types';

export interface Candidate {
  id: number;
  company_id: number;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  current_company?: string | null;
  current_role?: string | null;
  experience_years?: number | null;
  expected_ctc?: number | null;
  current_ctc?: number | null;
  notice_period?: number | null;
  source?: string | null;
  status: 'Applied' | 'Shortlisted' | 'Interview' | 'Offered' | 'Hired' | 'Rejected' | 'Withdrawn';
  resume_url?: string | null;
  created_at: string;
}

export const recruitmentService = {
  getCandidates: (params?: Record<string, unknown>) =>
    apiClient.get<unknown, ApiResponse<Candidate[]> & { meta: any }>('/candidates', { params }),

  getCandidate: (id: number) =>
    apiClient.get<unknown, ApiResponse<Candidate>>(`/candidates/${id}`),

  createCandidate: (data: Partial<Candidate>) =>
    apiClient.post<unknown, ApiResponse<Candidate>>('/candidates', data),

  updateCandidate: (id: number, data: Partial<Candidate>) =>
    apiClient.put<unknown, ApiResponse<Candidate>>(`/candidates/${id}`, data),

  deleteCandidate: (id: number) =>
    apiClient.delete<unknown, ApiResponse<null>>(`/candidates/${id}`),

  getPipelineStats: () =>
    apiClient.get<unknown, ApiResponse<{ status: string; count: number }[]>>('/candidates/pipeline-stats'),

  uploadResume: (id: number, file: File) => {
    const form = new FormData();
    form.append('resume', file);
    return apiClient.post<unknown, ApiResponse<{ resume_url: string }>>(`/candidates/${id}/resume`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
