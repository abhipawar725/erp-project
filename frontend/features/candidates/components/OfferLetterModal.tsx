'use client';
import { useEffect } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }         from 'zod';
import { Modal }     from '../../../components/ui/Modal';
import { useSendOffer } from '../hooks/useCandidates';
import type { Candidate } from '../types/candidate.types';

const today = new Date().toISOString().slice(0, 10);

const schema = z.object({
  offered_ctc: z
    .number({ invalid_type_error: 'Enter a valid amount' })
    .positive('CTC must be greater than 0'),
  confirmed_joining_date: z
    .string()
    .min(1, 'Joining date is required')
    .refine(d => d >= today, 'Joining date cannot be in the past'),
  offer_valid_till: z
    .string()
    .min(1, 'Validity date is required')
    .refine(d => d >= today, 'Validity cannot be in the past'),
  offer_letter_url: z
    .string()
    .url('Enter a valid URL')
    .optional()
    .or(z.literal('')),
}).refine(
  d => !d.offer_valid_till || !d.confirmed_joining_date || d.offer_valid_till >= today,
  { path: ['offer_valid_till'], message: 'Offer validity must be in the future' },
);

type FormData = z.infer<typeof schema>;

interface Props {
  open:      boolean;
  onClose:   () => void;
  candidate: Candidate | null;
}

export function OfferLetterModal({ open, onClose, candidate }: Props) {
  const sendMutation = useSendOffer(candidate?.id ?? 0);

  const {
    register, handleSubmit, reset, watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        offered_ctc:            candidate?.expected_salary ?? undefined,
        confirmed_joining_date: candidate?.decision_joining_date?.slice(0, 10) || candidate?.expected_joining_date?.slice(0, 10) || '',
        offer_valid_till:       '',
        offer_letter_url:       '',
      });
    }
  }, [open, candidate, reset]);

  const ctcVal = watch('offered_ctc');
  const annual = ctcVal ? (Number(ctcVal) * 12 / 100000).toFixed(2) : null;

  const onSubmit = async (data: FormData) => {
    await sendMutation.mutateAsync({
      offered_ctc:            data.offered_ctc,
      confirmed_joining_date: data.confirmed_joining_date,
      offer_valid_till:       data.offer_valid_till,
      offer_letter_url:       data.offer_letter_url || undefined,
    });
    onClose();
  };

  const isBusy = sendMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send Offer Letter"
      subtitle={`Formalise the offer for ${candidate?.candidate_name ?? ''}. An email will be sent automatically.`}
      width={520}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose} disabled={isBusy}>Cancel</button>
          <button
            className="btn btn-pri"
            style={{ background: 'var(--green)', borderColor: 'var(--green)' }}
            onClick={handleSubmit(onSubmit)}
            disabled={isBusy}
          >
            {isBusy
              ? <><Spinner /> Sending…</>
              : '✉ Send Offer Letter'}
          </button>
        </>
      }
    >
      {/* CTC */}
      <div className="fg">
        <label>Offered CTC (₹ / month) *</label>
        <input
          type="number"
          min="1"
          placeholder="e.g. 75000"
          {...register('offered_ctc', { valueAsNumber: true })}
        />
        {annual && (
          <span style={{ fontSize: 11, color: 'var(--green)', marginTop: 3 }}>
            ≈ ₹{annual}L / year
          </span>
        )}
        {errors.offered_ctc && <span className="err">{errors.offered_ctc.message}</span>}
      </div>

      {/* Joining date & validity in 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div className="fg">
          <label>Confirmed Joining Date *</label>
          <input type="date" min={today} {...register('confirmed_joining_date')} />
          {errors.confirmed_joining_date && <span className="err">{errors.confirmed_joining_date.message}</span>}
        </div>
        <div className="fg">
          <label>Offer Valid Till *</label>
          <input type="date" min={today} {...register('offer_valid_till')} />
          {errors.offer_valid_till && <span className="err">{errors.offer_valid_till.message}</span>}
        </div>
      </div>

      {/* Offer letter document URL */}
      <div className="fg">
        <label>Offer Letter Document URL <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--ink4)' }}>— optional</span></label>
        <input
          type="url"
          placeholder="https://drive.google.com/… or S3 link"
          {...register('offer_letter_url')}
        />
        {errors.offer_letter_url && <span className="err">{errors.offer_letter_url.message}</span>}
      </div>

      {/* Info note */}
      <div style={{
        background: 'var(--green-lt)', border: '1px solid var(--green-bd)',
        borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--green)',
      }}>
        📧 An offer letter email will be sent to <strong>{candidate?.email || 'the candidate'}</strong>.
        The candidate portal will also reflect the offer details.
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 12, height: 12,
      border: '2px solid rgba(255,255,255,.35)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin .65s linear infinite',
    }} />
  );
}
