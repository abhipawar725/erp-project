'use client';
import { useEffect, useState } from 'react';
import { useForm }             from 'react-hook-form';
import { zodResolver }         from '@hookform/resolvers/zod';
import { Modal }               from '../../../components/ui/Modal';
import { useCreateCandidate, useUpdateCandidate } from '../hooks/useCandidates';
import { candidateSchema, type CandidateFormData } from '../validations/candidate.schema';
import type { Candidate }      from '../types/candidate.types';
import { ALL_SOURCES, SOURCE_EMOJI } from '../types/candidate.types';

interface Props {
  open:        boolean;
  onClose:     () => void;
  candidate?:  Candidate | null;
}

const TABS = [
  { id: 'personal',       label: '👤 Personal'     },
  { id: 'professional',   label: '💼 Professional'  },
  { id: 'compensation',   label: '₹ Compensation'   },
  { id: 'sourcing',       label: '📡 Sourcing'       },
] as const;

type TabId = typeof TABS[number]['id'];

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className="err">{msg}</span>;
}

export function CandidateFormModal({ open, onClose, candidate }: Props) {
  const isEdit         = !!candidate;
  const [tab, setTab]  = useState<TabId>('personal');
  const createMutation = useCreateCandidate();
  const updateMutation = useUpdateCandidate(candidate?.id ?? 0);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema),
  });

  useEffect(() => {
    if (!open) { setTimeout(() => setTab('personal'), 200); return; }
    if (candidate) {
      reset({
        candidate_name:           candidate.candidate_name,
        email:                    candidate.email           ?? '',
        phone_number:             candidate.phone_number    ?? '',
        gender:                   candidate.gender          ?? '',
        date_of_birth:            candidate.date_of_birth   ?? '',
        current_company_name:     candidate.current_company_name    ?? '',
        last_company_designation: candidate.last_company_designation ?? '',
        qualification:            candidate.qualification   ?? '',
        location:                 candidate.location        ?? '',
        total_experience:         candidate.total_experience    ?? undefined,
        relevant_experience:      candidate.relevant_experience  ?? undefined,
        skills:                   (candidate.skills || []).join(', '),
        current_salary:           candidate.current_salary  ?? undefined,
        expected_salary:          candidate.expected_salary ?? undefined,
        notice_period:            candidate.notice_period   ?? undefined,
        notice_period_unit:       candidate.notice_period_unit ?? 'Days',
        immediate_joiner:         candidate.immediate_joiner ?? false,
        expected_joining_date:    candidate.expected_joining_date ?? '',
        own_vehicle:              candidate.own_vehicle ?? false,
        source:                   candidate.source          ?? '',
        reference_source:         candidate.reference_source ?? '',
        remarks:                  candidate.remarks          ?? '',
      });
    } else {
      reset({ notice_period_unit: 'Days', immediate_joiner: false, own_vehicle: false });
    }
  }, [open, candidate, reset]);

  const onSubmit = async (data: CandidateFormData) => {
    const skillsArray = data.skills
      ? String(data.skills).split(',').map((s) => s.trim()).filter(Boolean)
      : null;

    const payload = {
      candidate_name:           data.candidate_name,
      email:                    data.email           || null,
      phone_number:             data.phone_number    || null,
      gender:                   (data.gender || null) as any,
      date_of_birth:            data.date_of_birth   || null,
      current_company_name:     data.current_company_name     || null,
      last_company_designation: data.last_company_designation || null,
      qualification:            data.qualification   || null,
      location:                 data.location        || null,
      total_experience:         data.total_experience    ?? null,
      relevant_experience:      data.relevant_experience  ?? null,
      skills:                   skillsArray,
      current_salary:           data.current_salary  ?? null,
      expected_salary:          data.expected_salary ?? null,
      notice_period:            data.notice_period   ?? null,
      notice_period_unit:       (data.notice_period_unit || 'Days') as any,
      immediate_joiner:         data.immediate_joiner ?? false,
      expected_joining_date:    data.expected_joining_date || null,
      own_vehicle:              data.own_vehicle ?? false,
      source:                   (data.source || null) as any,
      reference_source:         data.reference_source || null,
      remarks:                  data.remarks         || null,
    };

    if (isEdit) await updateMutation.mutateAsync(payload);
    else        await createMutation.mutateAsync(payload);
    onClose();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${candidate?.candidate_name}` : 'Add Candidate'}
      subtitle={isEdit ? 'Update candidate profile' : 'Add a new candidate to the recruitment pipeline'}
      width={560}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button
            className="btn btn-pri"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isSaving && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />}
            {isSaving ? 'Saving…' : isEdit ? '✓ Save Changes' : '✓ Add Candidate'}
          </button>
        </>
      }
    >
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 20, marginTop: -4 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '7px 12px', border: 'none', background: 'transparent',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              color:        tab === t.id ? 'var(--blue)' : 'var(--ink4)',
              borderBottom: tab === t.id ? '2px solid var(--blue)' : '2px solid transparent',
              marginBottom: -1, whiteSpace: 'nowrap', transition: 'color .1s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Personal ───────────────────────────────────────────────── */}
      {tab === 'personal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div className="fg" style={{ gridColumn: '1 / -1' }}>
            <label>Full Name *</label>
            <input placeholder="e.g. Priya Sharma" {...register('candidate_name')} autoFocus />
            <Err msg={errors.candidate_name?.message} />
          </div>
          <div className="fg">
            <label>Email</label>
            <input type="email" placeholder="priya@gmail.com" {...register('email')} />
            <Err msg={errors.email?.message} />
          </div>
          <div className="fg">
            <label>Phone Number</label>
            <input type="tel" placeholder="+91 98765 43210" {...register('phone_number')} />
            <Err msg={errors.phone_number?.message} />
          </div>
          <div className="fg">
            <label>Gender</label>
            <select {...register('gender')}>
              <option value="">— Select —</option>
              <option>Male</option><option>Female</option>
              <option>Other</option><option>Prefer not to say</option>
            </select>
          </div>
          <div className="fg">
            <label>Date of Birth</label>
            <input type="date" {...register('date_of_birth')} />
          </div>
          <div className="fg">
            <label>Location</label>
            <input placeholder="e.g. Bengaluru, Karnataka" {...register('location')} />
          </div>
          <div className="fg">
            <label>Qualification</label>
            <input placeholder="e.g. B.E. Computer Science" {...register('qualification')} />
          </div>
        </div>
      )}

      {/* ── Tab: Professional ───────────────────────────────────────────── */}
      {tab === 'professional' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div className="fg">
            <label>Current Company</label>
            <input placeholder="Infosys, TCS, Startup…" {...register('current_company_name')} />
          </div>
          <div className="fg">
            <label>Last Designation</label>
            <input placeholder="Senior Engineer, Manager…" {...register('last_company_designation')} />
          </div>
          <div className="fg">
            <label>Total Experience (years)</label>
            <input type="number" step="0.5" min="0" max="60" placeholder="e.g. 4.5"
              {...register('total_experience', { valueAsNumber: true })} />
            <Err msg={errors.total_experience?.message} />
          </div>
          <div className="fg">
            <label>Relevant Experience (years)</label>
            <input type="number" step="0.5" min="0" max="60" placeholder="e.g. 3.0"
              {...register('relevant_experience', { valueAsNumber: true })} />
            <Err msg={errors.relevant_experience?.message} />
          </div>
          <div className="fg" style={{ gridColumn: '1 / -1' }}>
            <label>Skills</label>
            <input placeholder="React, Node.js, MySQL, Docker — comma separated" {...register('skills')} />
            <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>Enter skills separated by commas</span>
          </div>
          <div className="fg">
            <label>Notice Period</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="number" min="0" placeholder="30"
                {...register('notice_period', { valueAsNumber: true })}
                style={{ flex: 2 }} />
              <select {...register('notice_period_unit')} style={{ flex: 1 }}>
                <option value="Days">Days</option>
                <option value="Months">Months</option>
              </select>
            </div>
          </div>
          <div className="fg">
            <label>Expected Joining Date</label>
            <input type="date" {...register('expected_joining_date')} />
          </div>
          <div className="fg" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
            <input type="checkbox" id="immediate_joiner" {...register('immediate_joiner')}
              style={{ width: 15, height: 15, accentColor: 'var(--blue)', cursor: 'pointer' }} />
            <label htmlFor="immediate_joiner" style={{ cursor: 'pointer', fontWeight: 600, margin: 0 }}>
              Immediate joiner
            </label>
          </div>
          <div className="fg" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
            <input type="checkbox" id="own_vehicle" {...register('own_vehicle')}
              style={{ width: 15, height: 15, accentColor: 'var(--blue)', cursor: 'pointer' }} />
            <label htmlFor="own_vehicle" style={{ cursor: 'pointer', fontWeight: 600, margin: 0 }}>
              Owns a vehicle
            </label>
          </div>
        </div>
      )}

      {/* ── Tab: Compensation ───────────────────────────────────────────── */}
      {tab === 'compensation' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div className="fg">
            <label>Current Salary (₹ / month)</label>
            <input type="number" min="0" placeholder="e.g. 75000"
              {...register('current_salary', { valueAsNumber: true })} />
            <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>In-hand monthly amount</span>
            <Err msg={errors.current_salary?.message} />
          </div>
          <div className="fg">
            <label>Expected Salary (₹ / month)</label>
            <input type="number" min="0" placeholder="e.g. 90000"
              {...register('expected_salary', { valueAsNumber: true })} />
            <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>Expected monthly in-hand</span>
            <Err msg={errors.expected_salary?.message} />
          </div>
          {/* CTC preview */}
          {(watch('current_salary') || watch('expected_salary')) && (
            <div style={{ gridColumn: '1 / -1', background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12 }}>
              <div style={{ display: 'flex', gap: 32 }}>
                {watch('current_salary') && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 2 }}>Current CTC (approx.)</div>
                    <div style={{ fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>
                      ₹{((Number(watch('current_salary')) * 12) / 100000).toFixed(2)}L/yr
                    </div>
                  </div>
                )}
                {watch('expected_salary') && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 2 }}>Expected CTC (approx.)</div>
                    <div style={{ fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--mono)' }}>
                      ₹{((Number(watch('expected_salary')) * 12) / 100000).toFixed(2)}L/yr
                    </div>
                  </div>
                )}
                {watch('current_salary') && watch('expected_salary') && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 2 }}>Hike %</div>
                    <div style={{ fontWeight: 700, color: Number(watch('expected_salary')) > Number(watch('current_salary')) ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)' }}>
                      {((( Number(watch('expected_salary')) - Number(watch('current_salary'))) / Number(watch('current_salary'))) * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Sourcing ───────────────────────────────────────────────── */}
      {tab === 'sourcing' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div className="fg">
            <label>Source</label>
            <select {...register('source')}>
              <option value="">— Select source —</option>
              {ALL_SOURCES.map((s) => (
                <option key={s} value={s}>{SOURCE_EMOJI[s]} {s}</option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label>Reference / Campaign</label>
            <input placeholder="e.g. Ravi Sharma, Job fair May 2026" {...register('reference_source')} />
            <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>Who referred or which campaign</span>
          </div>
          <div className="fg" style={{ gridColumn: '1 / -1' }}>
            <label>Remarks</label>
            <textarea
              rows={4}
              placeholder="Additional notes about the candidate…"
              style={{ resize: 'vertical', minHeight: 90 }}
              {...register('remarks')}
            />
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
