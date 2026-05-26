'use client';
import { useEffect } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }         from 'zod';
import { Modal }     from '../../../components/ui/Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '../../../services/api/candidate.service';
import { showToast }        from '../../../utils/toast';
import type { Candidate }   from '../types/candidate.types';

const schema = z.object({
  interview_date: z.string().min(1, 'Date required').refine(d => {
    const today = new Date(); today.setHours(0,0,0,0);
    return new Date(d) >= today;
  }, 'Interview date cannot be in the past'),
  interview_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  interview_type: z.enum(['Online','Offline','Phone']),
  interview_link: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  interview_instructions: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open:      boolean;
  onClose:   () => void;
  candidate: Candidate | null;
}

export function InterviewSchedulerModal({ open, onClose, candidate }: Props) {
  const qc = useQueryClient();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { interview_type: 'Online' },
  });

  useEffect(() => {
    if (open && candidate) {
      reset({
        interview_date:         candidate.interview_date?.slice(0,10) || '',
        interview_time:         candidate.interview_time || '',
        interview_type:         candidate.interview_type || 'Online',
        interview_link:         candidate.interview_link || '',
        interview_instructions: candidate.interview_instructions || '',
      });
    } else if (open) {
      reset({ interview_type: 'Online' });
    }
  }, [open, candidate, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      candidateService.scheduleInterview(candidate!.id, data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] });
      showToast('✓ Interview scheduled — email sent to candidate');
      onClose();
    },
    onError: (err: any) => showToast(err?.message || 'Schedule failed'),
  });

  const interviewType = watch('interview_type');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Schedule Interview — ${candidate?.candidate_name || ''}`}
      subtitle="Set date, time and type. An email will be sent automatically."
      width={500}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-pri"
            onClick={handleSubmit((d) => mutation.mutate(d))}
            disabled={mutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {mutation.isPending && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />}
            {mutation.isPending ? 'Scheduling…' : '📅 Schedule & Send Email'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        {/* Date */}
        <div className="fg">
          <label>Interview Date *</label>
          <input type="date" {...register('interview_date')} min={new Date().toISOString().slice(0,10)} />
          {errors.interview_date && <span className="err">{errors.interview_date.message}</span>}
        </div>
        {/* Time */}
        <div className="fg">
          <label>Interview Time *</label>
          <input type="time" {...register('interview_time')} />
          {errors.interview_time && <span className="err">{errors.interview_time.message}</span>}
        </div>
        {/* Type */}
        <div className="fg" style={{ gridColumn: '1 / -1' }}>
          <label>Interview Type *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['Online','Offline','Phone'] as const).map((t) => (
              <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1, background: interviewType === t ? 'var(--blue-lt)' : 'var(--surface2)', border: `1px solid ${interviewType === t ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 12, fontWeight: 600, color: interviewType === t ? 'var(--blue)' : 'var(--ink4)', transition: 'all .1s' }}>
                <input type="radio" value={t} {...register('interview_type')} style={{ display: 'none' }} />
                {t === 'Online' ? '💻' : t === 'Offline' ? '🏢' : '📞'} {t}
              </label>
            ))}
          </div>
        </div>
        {/* Meeting link (only for online) */}
        {interviewType === 'Online' && (
          <div className="fg" style={{ gridColumn: '1 / -1' }}>
            <label>Meeting Link</label>
            <input type="url" placeholder="https://meet.google.com/xxx or https://zoom.us/j/xxx" {...register('interview_link')} />
            {errors.interview_link && <span className="err">{errors.interview_link.message}</span>}
          </div>
        )}
        {/* Instructions */}
        <div className="fg" style={{ gridColumn: '1 / -1' }}>
          <label>Instructions for Candidate</label>
          <textarea rows={3} placeholder="What to bring, dress code, topics to prepare…" {...register('interview_instructions')} style={{ resize: 'vertical' }} />
        </div>
      </div>

      {/* Email preview banner */}
      <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 11, color: 'var(--blue)' }}>
        📧 An email will be automatically sent to <strong>{candidate?.email || 'the candidate'}</strong> with the interview details.
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
