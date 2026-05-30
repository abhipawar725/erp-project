import apiClient from '../../services/api/client';
import axios from 'axios';
import type { ApiResponse } from '../../types/api.types';
import type {
  Candidate, CandidateStats, CreateCandidateDto,
  UpdateCandidateDto, CandidateQueryParams, BulkUploadResult, CandidateStatus,
} from '../../features/candidates/types/candidate.types';

// ─── HR API service ────────────────────────────────────────────────────────────
// Uses the standard apiClient (HR JWT from Redux/localStorage 'access_token')
export const candidateService = {
  getAll: (params?: CandidateQueryParams) =>
    apiClient.get<unknown, ApiResponse<Candidate[]> & { meta: any }>('/candidates', { params }),

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

  scheduleInterview: (id: number, data: {
    interview_date: string;
    interview_time: string;
    interview_type: string;
    interview_link?: string;
    interview_instructions?: string;
  }) => apiClient.patch<unknown, ApiResponse<Candidate>>(`/candidates/${id}/interview`, data),

  handleReschedule: (id: number, decision: 'Approved' | 'Rejected', new_date?: string, new_time?: string) =>
    apiClient.patch<unknown, ApiResponse<Candidate>>(`/candidates/${id}/reschedule-decision`, { decision, new_date, new_time }),

  grantPortalAccess: (id: number, data: { password?: string; send_email?: boolean }) =>
    apiClient.patch<unknown, ApiResponse<{ is_portal_user: boolean; temp_password: string; email_sent: boolean; is_new_access: boolean }>>(`/candidates/${id}/portal-access`, data),

  delete: (id: number) =>
    apiClient.delete<unknown, ApiResponse<null>>(`/candidates/${id}`),

  uploadResume: (id: number, file: File) => {
    const form = new FormData();
    form.append('resume', file);
    return apiClient.post<unknown, ApiResponse<{ resume_url: string }>>(`/candidates/${id}/resume`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },


  submitInterviewResult: (id: number, data: {
    interview_result_by: number;
    interview_result_mode: 'Online' | 'Offline';
    interview_result_date: string;
    interview_result_feedback?: string;
    candidate_decision: 'Select' | 'Reject' | 'On_Hold';
    decision_reason?: string;
    decision_joining_date?: string;
  }) => apiClient.patch<unknown, ApiResponse<Candidate>>(`/candidates/${id}/interview-result`, data),



  getPreInterviewForm: (id: number) =>
    apiClient.get<unknown, ApiResponse<any>>(`/candidates/${id}/form/pre-interview`),

  getPreJoiningForm: (id: number) =>
    apiClient.get<unknown, ApiResponse<any>>(`/candidates/${id}/form/pre-joining`),

  sendOffer: (id: number, data: {
    offered_ctc: number;
    confirmed_joining_date: string;
    offer_valid_till: string;
    offer_letter_url?: string;
  }) => apiClient.patch<unknown, ApiResponse<Candidate>>(`/candidates/${id}/send-offer`, data),

  hireCandidate: (id: number, data: {
    department_id: number;
    designation_id: number;
    employment_type: string;
    date_of_joining: string;
    reporting_manager_id?: number | null;
  }) => apiClient.patch<unknown, ApiResponse<{ candidate: Candidate; employee: any }>>(`/candidates/${id}/hire`, data),

  withdrawCandidate: (id: number, reason: string) =>
    apiClient.patch<unknown, ApiResponse<Candidate>>(`/candidates/${id}/withdraw`, { reason }),

  sendAptitudeTestLink: (id: number, testId: number) =>
    apiClient.post<unknown, ApiResponse<{ sent: boolean; testUrl: string }>>(`/candidates/${id}/send-aptitude-test`, { test_id: testId }),

  sendPreInterviewForm: (id: number) =>
    apiClient.post<unknown, ApiResponse<{ sent: boolean }>>(`/candidates/${id}/send-pre-interview`),

  sendPreJoiningFormLink: (id: number) =>
    apiClient.post<unknown, ApiResponse<{ sent: boolean; email: string }>>(
      `/candidates/${id}/send-pre-joining`,
      {},
    ),

  bulkUpload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<unknown, ApiResponse<BulkUploadResult>>('/candidates/bulk', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Portal API client ─────────────────────────────────────────────────────────
// Separate Axios instance for portal — reads token from localStorage,
// not from the main HR token store.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const portalClient = axios.create({ baseURL: API_BASE, withCredentials: true });

// Inject portal token from localStorage on every request
portalClient.interceptors.request.use(config => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('portal_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap the response data (axios returns { data: { success, data, message } })
portalClient.interceptors.response.use(
  response => response.data,
  error => {
    const msg = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(msg));
  },
);

// ─── Portal service ────────────────────────────────────────────────────────────
export const portalService = {
  login: (email: string, password: string, company_id?: number) =>
    portalClient.post<unknown, ApiResponse<{ token: string; candidateId: number; name: string }>>(
      '/candidates/portal/login',
      { email, password, company_id: company_id || 1 },
    ),

  magicLink: (email: string, company_id?: number) =>
    portalClient.post<unknown, ApiResponse<{ magicToken?: string } | null>>(
      '/candidates/portal/magic-link',
      { email, company_id: company_id || 1 },
    ),

  verifyMagic: (token: string, company_id?: number) =>
    portalClient.post<unknown, ApiResponse<{ token: string; candidateId: number; name: string }>>(
      '/candidates/portal/verify-magic',
      { token, company_id: company_id || 1 },
    ),


  getCompanyInfo: () =>
    portalClient.get<unknown, ApiResponse<{ name: string; logo_url: string | null; address: string | null }>>(
      '/candidates/portal/company-info',
    ),

  getProfile: () =>
    portalClient.get<unknown, ApiResponse<Candidate>>('/candidates/portal/profile'),

  respondInterview: (accepted: boolean) =>
    portalClient.post<unknown, ApiResponse<Candidate>>(
      '/candidates/portal/interview-response',
      { accepted },
    ),

  requestReschedule: (reason: string, proposed_date?: string, proposed_time?: string) =>
    portalClient.post<unknown, ApiResponse<Candidate>>(
      '/candidates/portal/reschedule',
      { reason, proposed_date, proposed_time },
    ),


  savePreJoining: (form_data: Record<string, unknown>, is_draft: boolean) =>
    portalClient.post<unknown, ApiResponse<any>>(
      '/candidates/portal/prejoining',
      { form_data, is_draft },
    ),

  savePreinterview: (
    form_data: Record<string, unknown>,
    is_draft: boolean
  ) => {

    console.log('FORM DATA =>', form_data);
    console.log('IS DRAFT =>', is_draft);

    return portalClient.post(
      '/candidates/portal/preinterview',
      { form_data, is_draft },
    );
  },
};
