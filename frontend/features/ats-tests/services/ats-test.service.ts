import apiClient from '../../../services/api/client';
import axios     from 'axios';
import type { ApiResponse } from '../../../types/api.types';
import type {
  AptitudeTest, AptitudeQuestion,
  CandidateTestResult, TestSubmissionResult,
  CreateTestDto, UpdateTestDto,
  CreateQuestionDto, UpdateQuestionDto,
  AptitudeTestForCandidate, TestSubmission,
} from '../types/ats-test.types';

// ─── HR service (uses standard admin JWT) ─────────────────────────────────────

export const atsTestService = {
  // Tests
  getAll: () =>
    apiClient.get<unknown, ApiResponse<AptitudeTest[]>>('/aptitude'),

  getById: (testId: number) =>
    apiClient.get<unknown, ApiResponse<AptitudeTest>>(`/aptitude/${testId}`),

  create: (data: CreateTestDto) =>
    apiClient.post<unknown, ApiResponse<AptitudeTest>>('/aptitude', data),

  update: (testId: number, data: UpdateTestDto) =>
    apiClient.put<unknown, ApiResponse<AptitudeTest>>(`/aptitude/${testId}`, data),

  // Questions
  addQuestion: (testId: number, data: CreateQuestionDto) =>
    apiClient.post<unknown, ApiResponse<AptitudeQuestion>>(
      `/aptitude/${testId}/questions`,
      data,
    ),

  updateQuestion: (testId: number, questionId: number, data: UpdateQuestionDto) =>
    apiClient.put<unknown, ApiResponse<AptitudeQuestion>>(
      `/aptitude/${testId}/questions/${questionId}`,
      data,
    ),

  deleteQuestion: (testId: number, questionId: number) =>
    apiClient.delete<unknown, ApiResponse<null>>(
      `/aptitude/${testId}/questions/${questionId}`,
    ),

  // Results (HR only — never exposed to candidates)
  getCandidateResult: (testId: number, candidateId: number) =>
    apiClient.get<unknown, ApiResponse<CandidateTestResult>>(
      `/aptitude/${testId}/candidates/${candidateId}/result`,
    ),
};

// ─── Portal service (uses portal JWT from localStorage) ───────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const portalHttp = axios.create({ baseURL: API_BASE, withCredentials: true });

portalHttp.interceptors.request.use(cfg => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('portal_token') : null;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

portalHttp.interceptors.response.use(
  res  => res.data,
  err  => Promise.reject(new Error(err.response?.data?.message || err.message)),
);

export const atsPortalService = {
  getTest: (testId: number) =>
    portalHttp.get<unknown, ApiResponse<AptitudeTestForCandidate>>(
      `/aptitude/portal/${testId}`,
    ),

  submitTest: (testId: number, payload: TestSubmission) =>
    portalHttp.post<unknown, ApiResponse<TestSubmissionResult>>(
      `/aptitude/portal/${testId}/submit`,
      payload,
    ),
};
