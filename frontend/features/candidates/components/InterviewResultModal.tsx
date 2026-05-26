'use client';
import { useEffect, useState } from 'react';
import { useForm, Controller }  from 'react-hook-form';
import { zodResolver }          from '@hookform/resolvers/zod';
import { z }                    from 'zod';
import { Modal }                from '../../../components/ui/Modal';
import { useSubmitInterviewResult } from '../hooks/useCandidates';
import { useEmployees }            from '../../employees/hooks/useEmployees';
import type { Candidate }          from '../types/candidate.types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);

const schema = z.object({
  interview_result_by: z
    .number({ invalid_type_error: 'Interviewer is required' })
    .int()
    .positive('Interviewer is required'),

  interview_result_mode: z
    .enum(['Online', 'Offline'], { errorMap: () => ({ message: 'Select interview mode' }) }),

  interview_result_date: z
    .string()
    .min(1, 'Interview date is required')
    .refine(d => !!d, 'Interview date is required'),

  interview_result_feedback: z
    .string()
    .max(2000, 'Max 2000 characters')
    .optional()
    .or(z.literal('')),

  candidate_decision: z
    .enum(['Select', 'Reject', 'On_Hold'], {
      errorMap: () => ({ message: 'Candidate decision is required' }),
    }),

  decision_reason: z
    .string()
    .max(1000, 'Max 1000 characters')
    .optional()
    .or(z.literal('')),

  decision_joining_date: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      d => !d || d >= today,
      'Expected joining date cannot be in the past',
    ),
}).superRefine((data, ctx) => {
  if (data.candidate_decision === 'Select' && !data.decision_joining_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['decision_joining_date'],
      message: 'Expected joining date is required when candidate is selected',
    });
  }
});

type FormData = z.infer<typeof schema>;

// ─── Decision config ──────────────────────────────────────────────────────────

const DECISIONS = [
  {
    value:    'Select' as const,
    label:    'Select',
    icon:     '✓',
    desc:     'Candidate selected — will move to Offered',
    bg:       'var(--green-lt)',
    border:   'var(--green-bd)',
    text:     'var(--green)',
    selBg:    'var(--green)',
    selText:  '#fff',
  },
  {
    value:    'Reject' as const,
    label:    'Reject',
    icon:     '✗',
    desc:     'Candidate rejected — will move to Rejected',
    bg:       'var(--red-lt)',
    border:   'var(--red-bd)',
    text:     'var(--red)',
    selBg:    'var(--red)',
    selText:  '#fff',
  },
  {
    value:    'On_Hold' as const,
    label:    'On Hold',
    icon:     '⏸',
    desc:     'Candidate on hold — will move to On Hold',
    bg:       'var(--amber-lt)',
    border:   'var(--amber-bd)',
    text:     'var(--amber)',
    selBg:    'var(--amber)',
    selText:  '#fff',
  },
] as const;

// ─── Status outcome pill ──────────────────────────────────────────────────────

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  Select:  { label: '→ Offered',   color: 'var(--green)'  },
  Reject:  { label: '→ Rejected',  color: 'var(--red)'    },
  On_Hold: { label: '→ On Hold',   color: 'var(--amber)'  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open:      boolean;
  onClose:   () => void;
  candidate: Candidate | null;
}

export function InterviewResultModal({ open, onClose, candidate }: Props) {
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showDropdown,   setShowDropdown]   = useState(false);

  const submitMutation = useSubmitInterviewResult(candidate?.id ?? 0);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const decision = watch('candidate_decision');
  const selectedInterviewerId = watch('interview_result_by');

  // Load active employees for interviewer dropdown
  const { data: empData } = useEmployees({ limit: 200, status: 'Active' as any });
  const employees = empData?.data ?? [];

  const filteredEmployees = employeeSearch.trim()
    ? employees.filter(e =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.employee_code?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.designation?.name?.toLowerCase().includes(employeeSearch.toLowerCase()),
      )
    : employees.slice(0, 8);

  const selectedEmployee = employees.find(e => e.id === selectedInterviewerId);

  // Reset form on open
  useEffect(() => {
    if (open) {
      reset({});
      setEmployeeSearch('');
      setShowDropdown(false);
    }
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    if (!candidate) return;
    await submitMutation.mutateAsync({
      interview_result_by:        data.interview_result_by,
      interview_result_mode:      data.interview_result_mode,
      interview_result_date:      data.interview_result_date,
      interview_result_feedback:  data.interview_result_feedback || undefined,
      candidate_decision:         data.candidate_decision,
      decision_reason:            data.decision_reason            || undefined,
      decision_joining_date:      data.decision_joining_date      || undefined,
    });
    onClose();
  };

  if (!candidate) return null;

  const isBusy = isSubmitting || submitMutation.isPending;

  const outcomeInfo = decision ? OUTCOME_LABELS[decision] : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Interview Result"
      subtitle={`Record the final interview outcome for ${candidate.candidate_name}`}
      width={580}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button
            className="btn btn-pri"
            onClick={handleSubmit(onSubmit)}
            disabled={isBusy}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            {isBusy && (
              <span style={{
                width: 13, height: 13,
                border: '2px solid rgba(255,255,255,.35)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin .65s linear infinite',
              }} />
            )}
            {isBusy ? 'Submitting…' : 'Submit Result'}
          </button>
        </>
      }
    >
      {/* Outcome preview banner */}
      {outcomeInfo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r)', padding: '8px 12px',
          marginBottom: 18, fontSize: 12,
        }}>
          <span style={{ color: 'var(--ink4)' }}>Status after submission:</span>
          <strong style={{ color: outcomeInfo.color }}>{outcomeInfo.label}</strong>
        </div>
      )}

      {/* ─── Section divider ──────────────────────────────────────────── */}
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '.08em', color: 'var(--ink4)',
        borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 14,
      }}>
        Interview Details
      </div>

      {/* Interviewer searchable dropdown */}
      <div className="fg" style={{ position: 'relative' }}>
        <label>
          Interviewed By
          <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>
        </label>

        {/* Selected employee chip */}
        {selectedEmployee ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', border: '1px solid var(--blue)',
            borderRadius: 'var(--r)', background: 'var(--blue-lt)', cursor: 'pointer',
          }} onClick={() => { setValue('interview_result_by', undefined as any); setEmployeeSearch(''); }}>
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--blue), var(--purple))',
              color: '#fff', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {[selectedEmployee.first_name[0], selectedEmployee.last_name[0]].join('')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                {selectedEmployee.first_name} {selectedEmployee.last_name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink4)' }}>
                {selectedEmployee.designation?.name} · {selectedEmployee.employee_code}
              </div>
            </div>
            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--ink4)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }} title="Clear">×</button>
          </div>
        ) : (
          <>
            <input
              placeholder="Search by name or employee code…"
              value={employeeSearch}
              onChange={e => { setEmployeeSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              autoComplete="off"
            />

            {/* Dropdown */}
            {showDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--r)', boxShadow: 'var(--sh2)',
                maxHeight: 220, overflowY: 'auto', marginTop: 3,
              }}
                onMouseDown={e => e.preventDefault()}
              >
                {filteredEmployees.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--ink4)', textAlign: 'center' }}>
                    No employees found
                  </div>
                ) : filteredEmployees.map(emp => (
                  <div
                    key={emp.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    onClick={() => {
                      setValue('interview_result_by', emp.id, { shouldValidate: true });
                      setEmployeeSearch('');
                      setShowDropdown(false);
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--blue), var(--purple))', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {[emp.first_name[0], emp.last_name[0]].join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                        {emp.first_name} {emp.last_name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink4)' }}>
                        {emp.designation?.name || emp.employee_code}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Hidden Controller for RHF registration */}
        <Controller
          control={control}
          name="interview_result_by"
          render={() => <input type="hidden" />}
        />
        {errors.interview_result_by && (
          <span className="err">{errors.interview_result_by.message}</span>
        )}
      </div>

      {/* Interview mode + date — 2 column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        {/* Mode */}
        <div className="fg">
          <label>
            Interview Mode
            <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['Online', 'Offline'] as const).map(mode => {
              const isSelected = watch('interview_result_mode') === mode;
              return (
                <label
                  key={mode}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 12px', border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border2)'}`,
                    borderRadius: 'var(--r)', background: isSelected ? 'var(--blue-lt)' : 'var(--surface)',
                    cursor: 'pointer', fontSize: 12, fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'var(--blue)' : 'var(--ink3)', transition: 'all .1s',
                  }}
                >
                  <input type="radio" value={mode} {...register('interview_result_mode')} style={{ display: 'none' }} />
                  <span style={{ fontSize: 14 }}>{mode === 'Online' ? '💻' : '🏢'}</span>
                  {mode}
                </label>
              );
            })}
          </div>
          {errors.interview_result_mode && <span className="err">{errors.interview_result_mode.message}</span>}
        </div>

        {/* Interview date */}
        <div className="fg">
          <label>
            Interview Date &amp; Time
            <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>
          </label>
          <input
            type="datetime-local"
            {...register('interview_result_date')}
          />
          {errors.interview_result_date && <span className="err">{errors.interview_result_date.message}</span>}
        </div>
      </div>

      {/* Feedback */}
      <div className="fg">
        <label>Interview Feedback <span style={{ fontWeight: 400, color: 'var(--ink4)', textTransform: 'none', letterSpacing: 0 }}>— optional</span></label>
        <textarea
          rows={3}
          placeholder="Summarise interviewer observations, strengths, areas of concern…"
          {...register('interview_result_feedback')}
        />
        {errors.interview_result_feedback && <span className="err">{errors.interview_result_feedback.message}</span>}
      </div>

      {/* ─── Section divider ──────────────────────────────────────────── */}
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '.08em', color: 'var(--ink4)',
        borderBottom: '1px solid var(--border)', paddingBottom: 6,
        marginBottom: 16, marginTop: 4,
      }}>
        Candidate Decision
      </div>

      {/* Decision selector — 3 cards */}
      <div className="fg">
        <label>
          Decision
          <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {DECISIONS.map(opt => {
            const isSelected = decision === opt.value;
            return (
              <label
                key={opt.value}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '14px 10px', border: `1px solid ${isSelected ? opt.selBg : opt.border}`,
                  borderRadius: 'var(--r2)', cursor: 'pointer', textAlign: 'center',
                  background: isSelected ? opt.selBg : opt.bg,
                  transition: 'all .12s',
                }}
              >
                <input type="radio" value={opt.value} {...register('candidate_decision')} style={{ display: 'none' }} />
                <span style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  background: isSelected ? 'rgba(255,255,255,.25)' : 'var(--surface)',
                  border: `1px solid ${isSelected ? 'rgba(255,255,255,.4)' : opt.border}`,
                  color: isSelected ? opt.selText : opt.text,
                  fontWeight: 700,
                }}>
                  {opt.icon}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? opt.selText : opt.text }}>
                  {opt.label}
                </span>
                <span style={{ fontSize: 10, color: isSelected ? `${opt.selText}cc` : opt.text, lineHeight: 1.3, opacity: .85 }}>
                  {opt.desc.split(' — ')[0]}
                </span>
              </label>
            );
          })}
        </div>
        {errors.candidate_decision && <span className="err">{errors.candidate_decision.message}</span>}
      </div>

      {/* ─── Conditional fields ────────────────────────────────────────── */}

      {/* SELECT → Expected joining date */}
      {decision === 'Select' && (
        <div className="fg" style={{
          background: 'var(--green-lt)', border: '1px solid var(--green-bd)',
          borderRadius: 'var(--r2)', padding: '14px 16px', marginTop: 4,
        }}>
          <label style={{ color: 'var(--green)' }}>
            Expected Joining Date
            <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>
          </label>
          <input
            type="date"
            min={today}
            {...register('decision_joining_date')}
            style={{ background: 'var(--surface)' }}
          />
          {errors.decision_joining_date && <span className="err">{errors.decision_joining_date.message}</span>}
          <span style={{ fontSize: 10, color: 'var(--green)', marginTop: 3 }}>
            Candidate will be notified with this date when the offer is sent.
          </span>
        </div>
      )}

      {/* REJECT → Rejection reason */}
      {decision === 'Reject' && (
        <div className="fg" style={{
          background: 'var(--red-lt)', border: '1px solid var(--red-bd)',
          borderRadius: 'var(--r2)', padding: '14px 16px', marginTop: 4,
        }}>
          <label style={{ color: 'var(--red)' }}>Rejection Reason</label>
          <textarea
            rows={3}
            placeholder="e.g. Communication skills below threshold, technical gaps in core areas…"
            {...register('decision_reason')}
            style={{ background: 'var(--surface)' }}
          />
          {errors.decision_reason && <span className="err">{errors.decision_reason.message}</span>}
        </div>
      )}

      {/* ON_HOLD → Hold reason */}
      {decision === 'On_Hold' && (
        <div className="fg" style={{
          background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)',
          borderRadius: 'var(--r2)', padding: '14px 16px', marginTop: 4,
        }}>
          <label style={{ color: 'var(--amber)' }}>Hold Reason</label>
          <textarea
            rows={3}
            placeholder="e.g. Budget freeze, better fit being evaluated, position deferred…"
            {...register('decision_reason')}
            style={{ background: 'var(--surface)' }}
          />
          {errors.decision_reason && <span className="err">{errors.decision_reason.message}</span>}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
