'use client';
import { useEffect } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }         from 'zod';
import { Modal }     from '../../../components/ui/Modal';
import { useWithdrawCandidate } from '../hooks/useCandidates';
import type { Candidate } from '../types/candidate.types';
import { STATUS_LABEL, type CandidateStatus } from '../types/candidate.types';

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Please provide a meaningful reason (min 5 characters)')
    .max(1000, 'Max 1000 characters'),
});

type FormData = z.infer<typeof schema>;

const QUICK_REASONS = [
  'Candidate declined the offer',
  'Candidate accepted another offer',
  'Candidate is unresponsive',
  'Position no longer available',
  'Candidate failed background check',
  'Candidate requested withdrawal',
  'Salary expectation mismatch',
];

interface Props {
  open:      boolean;
  onClose:   () => void;
  candidate: Candidate | null;
}

export function WithdrawModal({ open, onClose, candidate }: Props) {
  const withdrawMutation = useWithdrawCandidate(candidate?.id ?? 0);

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const reason = watch('reason');

  useEffect(() => {
    if (open) reset({ reason: '' });
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    await withdrawMutation.mutateAsync(data.reason);
    onClose();
  };

  const isBusy = withdrawMutation.isPending;
  const currentLabel = candidate?.status
    ? STATUS_LABEL[candidate.status as CandidateStatus] || candidate.status
    : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Withdraw Candidate"
      subtitle={`Remove ${candidate?.candidate_name ?? ''} from the recruitment pipeline`}
      width={500}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose} disabled={isBusy}>Cancel</button>
          <button
            className="btn btn-danger"
            onClick={handleSubmit(onSubmit)}
            disabled={isBusy}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            {isBusy && <Spinner />}
            {isBusy ? 'Withdrawing…' : 'Confirm Withdrawal'}
          </button>
        </>
      }
    >
      {/* Warning */}
      <div style={{
        background: 'var(--red-lt)', border: '1px solid var(--red-bd)',
        borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--red)',
      }}>
        ⚠ <strong>{candidate?.candidate_name}</strong> is currently at <strong>{currentLabel}</strong> stage.
        Withdrawal removes them from the active pipeline. This action is logged but reversible via stage move.
      </div>

      {/* Quick reasons */}
      <div className="fg">
        <label>Quick select a reason</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
          {QUICK_REASONS.map(qr => (
            <button
              key={qr}
              type="button"
              onClick={() => setValue('reason', qr, { shouldValidate: true })}
              style={{
                padding: '4px 10px', borderRadius: 99, fontSize: 11, fontFamily: 'var(--font)',
                cursor: 'pointer', transition: 'all .1s',
                border: `1px solid ${reason === qr ? 'var(--red)' : 'var(--border2)'}`,
                background: reason === qr ? 'var(--red-lt)' : 'var(--surface2)',
                color: reason === qr ? 'var(--red)' : 'var(--ink3)',
                fontWeight: reason === qr ? 600 : 400,
              }}
            >
              {qr}
            </button>
          ))}
        </div>
      </div>

      {/* Custom reason textarea */}
      <div className="fg">
        <label>Reason for withdrawal *</label>
        <textarea
          rows={3}
          placeholder="Explain why this candidate is being withdrawn…"
          {...register('reason')}
        />
        <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2, textAlign: 'right' }}>
          {(reason || '').length}/1000
        </span>
        {errors.reason && <span className="err">{errors.reason.message}</span>}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 12, height: 12,
      border: '2px solid rgba(0,0,0,.15)',
      borderTopColor: 'var(--red)',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin .65s linear infinite',
    }} />
  );
}
