import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { atsTestService } from '../services/ats-test.service';
import { showToast }      from '../../../utils/toast';
import type {
  CreateTestDto, UpdateTestDto,
  CreateQuestionDto, UpdateQuestionDto,
  TestSubmission,
} from '../types/ats-test.types';

// ─── Query key factory ────────────────────────────────────────────────────────

export const ATS_KEYS = {
  all:     ['aptitude-tests']                                   as const,
  list:    ()                           => ['aptitude-tests', 'list']           as const,
  detail:  (testId: number)             => ['aptitude-tests', testId]           as const,
  result:  (testId: number, candId: number) => ['aptitude-result', testId, candId] as const,
  portal:  (testId: number)             => ['portal-test', testId]              as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// HR HOOKS
// ─────────────────────────────────────────────────────────────────────────────

// ─── List all tests ───────────────────────────────────────────────────────────

export function useAptitudeTests() {
  return useQuery({
    queryKey:  ATS_KEYS.list(),
    queryFn:   () => atsTestService.getAll(),
    staleTime: 2 * 60_000,
    select:    res => res.data,
  });
}

// ─── Single test (with questions) ─────────────────────────────────────────────

export function useAptitudeTest(testId: number) {
  return useQuery({
    queryKey:  ATS_KEYS.detail(testId),
    queryFn:   () => atsTestService.getById(testId),
    enabled:   !!testId && testId > 0,
    staleTime: 60_000,
    select:    res => res.data,
  });
}

// ─── Create test ──────────────────────────────────────────────────────────────

export function useCreateAptitudeTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTestDto) => atsTestService.create(data),
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ATS_KEYS.all });
      showToast(`✓ Test "${res.data.title}" created`);
    },
    onError: (err: any) => showToast(err?.message || 'Failed to create test'),
  });
}

// ─── Update test ──────────────────────────────────────────────────────────────

export function useUpdateAptitudeTest(testId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTestDto) => atsTestService.update(testId, data),
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ATS_KEYS.all });
      qc.setQueryData(ATS_KEYS.detail(testId), res);
      showToast(`✓ "${res.data.title}" updated`);
    },
    onError: (err: any) => showToast(err?.message || 'Update failed'),
  });
}

// ─── Add question ─────────────────────────────────────────────────────────────

export function useAddQuestion(testId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuestionDto) => atsTestService.addQuestion(testId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ATS_KEYS.detail(testId) });
      showToast('✓ Question added');
    },
    onError: (err: any) => showToast(err?.message || 'Failed to add question'),
  });
}

// ─── Update question ──────────────────────────────────────────────────────────

export function useUpdateQuestion(testId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: number; data: UpdateQuestionDto }) =>
      atsTestService.updateQuestion(testId, questionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ATS_KEYS.detail(testId) });
      showToast('✓ Question updated');
    },
    onError: (err: any) => showToast(err?.message || 'Update failed'),
  });
}

// ─── Delete question ──────────────────────────────────────────────────────────

export function useDeleteQuestion(testId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) => atsTestService.deleteQuestion(testId, questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ATS_KEYS.detail(testId) });
      showToast('Question deleted');
    },
    onError: (err: any) => showToast(err?.message || 'Delete failed'),
  });
}

// ─── Candidate test result (HR only) ─────────────────────────────────────────

export function useCandidateTestResult(testId: number, candidateId: number | null) {
  return useQuery({
    queryKey:  ATS_KEYS.result(testId, candidateId ?? 0),
    queryFn:   () => atsTestService.getCandidateResult(testId, candidateId!),
    enabled:   !!testId && !!candidateId && candidateId > 0,
    staleTime: 30_000,
    select:    res => res.data,
    retry:     1,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL HOOKS (candidate-facing)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Get test for candidate (correct_option stripped server-side) ─────────────

export function usePortalAptitudeTest(testId: number) {
  return useQuery({
    queryKey: ATS_KEYS.portal(testId),
    queryFn:  () => {
      const { atsPortalService } = require('../services/ats-test.service');
      return atsPortalService.getTest(testId);
    },
    enabled:  !!testId && testId > 0,
    staleTime: Infinity,           // never re-fetch mid-test
    select:   (res: any) => res.data,
    retry:    1,
  });
}

// ─── Submit test answers ──────────────────────────────────────────────────────

export function useSubmitTest(testId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TestSubmission) => {
      const { atsPortalService } = require('../services/ats-test.service');
      return atsPortalService.submitTest(testId, payload);
    },
    onSuccess: () => {
      // Refresh candidate profile so aptitude_attempted_at updates on the dashboard
      qc.invalidateQueries({ queryKey: ['portal-profile'] });
    },
    onError: (err: any) => showToast(err?.message || 'Submission failed'),
  });
}
