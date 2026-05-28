import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '../../../services/api/candidate.service';
import { showToast }        from '../../../utils/toast';
import type {
  CreateCandidateDto, UpdateCandidateDto,
  CandidateQueryParams, CandidateStatus,
} from '../types/candidate.types';

// ─── Query key factory ────────────────────────────────────────────────────────
const KEYS = {
  all:    ['candidates']                                            as const,
  list:   (p?: CandidateQueryParams) => ['candidates', 'list', p] as const,
  stats:  ['candidates', 'stats']                                  as const,
  detail: (id: number)               => ['candidates', id]         as const,
};

// ─── List ─────────────────────────────────────────────────────────────────────
export function useCandidates(params?: CandidateQueryParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn:  () => candidateService.getAll(params),
    staleTime: 30_000,
    select:   (res) => ({ data: res.data, meta: (res as any).meta }),
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export function useCandidateStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn:  () => candidateService.getStats(),
    staleTime: 60_000,
    select:   (res) => res.data,
  });
}

// ─── Single ───────────────────────────────────────────────────────────────────
export function useCandidate(id: number) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn:  () => candidateService.getById(id),
    enabled:  !!id && id > 0,
    select:   (res) => res.data,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────
export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCandidateDto) => candidateService.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      showToast(`✓ ${res.data.candidate_name} added to pipeline`);
    },
    onError: (err: any) => showToast(err?.message || 'Failed to add candidate'),
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────
export function useUpdateCandidate(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCandidateDto) => candidateService.update(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.setQueryData(KEYS.detail(id), res);
      showToast('✓ Candidate updated');
    },
    onError: (err: any) => showToast(err?.message || 'Update failed'),
  });
}

// ─── Move status ──────────────────────────────────────────────────────────────
export function useMoveStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, remarks }: { id: number; status: CandidateStatus; remarks?: string }) =>
      candidateService.moveStatus(id, status, remarks),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      showToast(`✓ Moved to ${res.data.status.replace('_', ' ')}`);
    },
    onError: (err: any) => showToast(err?.message || 'Status update failed'),
  });
}

// ─── Schedule interview ───────────────────────────────────────────────────────
export function useScheduleInterview(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      interview_date: string;
      interview_time: string;
      interview_type: 'Online' | 'Offline' | 'Phone';
      interview_link?: string;
      interview_instructions?: string;
    }) => candidateService.scheduleInterview(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.setQueryData(KEYS.detail(id), res);
      showToast(`✓ Interview scheduled — email sent to ${res.data.candidate_name}`);
    },
    onError: (err: any) => showToast(err?.message || 'Schedule failed'),
  });
}

// ─── Handle reschedule decision ───────────────────────────────────────────────
export function useHandleReschedule(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ decision, new_date, new_time }: {
      decision: 'Approved' | 'Rejected';
      new_date?: string;
      new_time?: string;
    }) => candidateService.handleReschedule(id, decision, new_date, new_time),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.setQueryData(KEYS.detail(id), res);
      showToast(`Reschedule ${vars.decision.toLowerCase()}`);
    },
    onError: (err: any) => showToast(err?.message || 'Failed'),
  });
}

// ─── Grant portal access ──────────────────────────────────────────────────────
export function useGrantPortalAccess(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { password?: string; send_email?: boolean }) => candidateService.grantPortalAccess(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      const data = res.data as any;
      showToast(data.temp_password
        ? `✓ Portal access granted. Temp password: ${data.temp_password}`
        : '✓ Portal access granted');
    },
    onError: (err: any) => showToast(err?.message || 'Failed'),
  });
}


// ─── Submit interview result ───────────────────────────────────────────────────
export function useSubmitInterviewResult(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof candidateService.submitInterviewResult>[1]) =>
      candidateService.submitInterviewResult(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.setQueryData(KEYS.detail(id), res);
      const decision = res.data.candidate_decision;
      const msg = decision === 'Select'
        ? '✓ Candidate selected — status moved to Offered'
        : decision === 'Reject'
        ? 'Candidate rejected'
        : 'Candidate placed on hold';
      showToast(msg);
    },
    onError: (err: any) => showToast(err?.message || 'Failed to submit result'),
  });
}


// ─── Send offer letter ────────────────────────────────────────────────────────
export function useSendOffer(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof candidateService.sendOffer>[1]) =>
      candidateService.sendOffer(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      showToast('✓ Offer letter sent — email dispatched to candidate');
    },
    onError: (err: any) => showToast(err?.message || 'Failed to send offer'),
  });
}

// ─── Hire candidate ───────────────────────────────────────────────────────────
export function useHireCandidate(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof candidateService.hireCandidate>[1]) =>
      candidateService.hireCandidate(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      showToast('✓ Candidate hired — employee record created');
    },
    onError: (err: any) => showToast(err?.message || 'Failed to hire candidate'),
  });
}

// ─── Withdraw candidate ───────────────────────────────────────────────────────
export function useWithdrawCandidate(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => candidateService.withdrawCandidate(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      showToast('Candidate withdrawn from pipeline');
    },
    onError: (err: any) => showToast(err?.message || 'Failed to withdraw'),
  });
}


// ─── Send aptitude test link ─────────────────────────────────────────────────
export function useSendAptitudeTestLink(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (testId: number) => candidateService.sendAptitudeTestLink(id, testId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      showToast('✓ Aptitude test link sent to candidate');
    },
    onError: (err: any) => showToast(err?.message || 'Failed to send aptitude test'),
  });
}

// ─── Send pre-interview form ──────────────────────────────────────────────────
export function useSendPreInterviewForm(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => candidateService.sendPreInterviewForm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      showToast('✓ Pre-interview form link sent to candidate');
    },
    onError: (err: any) => showToast(err?.message || 'Failed to send form'),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => candidateService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      showToast('Candidate removed');
    },
    onError: (err: any) => showToast(err?.message || 'Delete failed'),
  });
}

// ─── Resume upload ────────────────────────────────────────────────────────────
// export function useUploadResume(id: number) {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: (file: File) => candidateService.uploadResume(id, file),
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: KEYS.detail(id) });
//       showToast('✓ Resume uploaded');
//     },
//     onError: (err: any) => showToast(err?.message || 'Upload failed'),
//   });
// }

export function useUploadResume(id: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (file: File) =>
      candidateService.uploadResume(id, file),

    onSuccess: () => {
      // detail page refresh
      qc.invalidateQueries({
        queryKey: KEYS.detail(id),
      });

      // table/list refresh
      qc.invalidateQueries({
        queryKey: KEYS.list(),
      });

      // optional global candidates refresh
      qc.invalidateQueries({
        queryKey: ['candidates'],
      });

      showToast('✓ Resume uploaded');
    },

    onError: (err: any) =>
      showToast(err?.message || 'Upload failed'),
  });
}


// ─── Bulk upload ──────────────────────────────────────────────────────────────
export function useBulkUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => candidateService.bulkUpload(file),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      const r = res.data;
      showToast(`✓ ${r.success}/${r.total} candidates imported`);
    },
    onError: (err: any) => showToast(err?.message || 'Bulk upload failed'),
  });
}
