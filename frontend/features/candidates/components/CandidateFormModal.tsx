'use client';
import { useEffect, useRef } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }         from 'zod';
import { Modal }     from '../../../components/ui/Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '../../../services/api/candidate.service';
import { showToast }        from '../../../utils/toast';
import type { Candidate }   from '../types/candidate.types';
import { ALL_SOURCES, SOURCE_EMOJI } from '../types/candidate.types';

const today = new Date().toISOString().slice(0, 10);

const schema = z.object({
  candidate_name:           z.string().min(1, 'Name is required').max(200).trim(),
  email:                    z.string().email('Invalid email').optional().or(z.literal('')),
  phone_number:             z.string().regex(/^[+\d\s\-()]{7,20}$/, 'Invalid phone').optional().or(z.literal('')),
  gender:                   z.enum(['Male','Female','Other','Prefer not to say','']).optional(),
  date_of_birth:            z.string().optional().or(z.literal('')),
  current_company_name:     z.string().max(200).optional().or(z.literal('')),
  last_company_designation: z.string().max(200).optional().or(z.literal('')),
  qualification:            z.string().max(200).optional().or(z.literal('')),
  location:                 z.string().max(200).optional().or(z.literal('')),
  total_experience:         z.number().min(0).max(60).optional().nullable(),
  relevant_experience:      z.number().min(0).max(60).optional().nullable(),
  skills:                   z.string().optional().or(z.literal('')),
  current_salary:           z.number().min(0).optional().nullable(),
  expected_salary:          z.number().min(0).optional().nullable(),
  notice_period:            z.number().int().min(0).optional().nullable(),
  immediate_joiner:         z.boolean().optional(),
  expected_joining_date:    z.string().optional().or(z.literal('')).refine(d => !d || d >= today, 'Joining date cannot be in the past'),
  own_vehicle:              z.boolean().optional(),
  source:                   z.enum([...ALL_SOURCES, '']).optional(),
  reference_source:         z.string().max(300).optional().or(z.literal('')),
  remarks:                  z.string().max(1000).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open:       boolean;
  onClose:    () => void;
  candidate?: Candidate | null;
}

const Section = ({ title }: { title: string }) => (
  <div style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.08em', paddingBottom: 8, paddingTop: 8, borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
    {title}
  </div>
);

export function CandidateFormModal({ open, onClose, candidate }: Props) {
  const isEdit = !!candidate;
  const qc     = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    reset(candidate ? {
      candidate_name: candidate.candidate_name, email: candidate.email || '',
      phone_number: candidate.phone_number || '', gender: candidate.gender || '',
      date_of_birth: candidate.date_of_birth?.slice(0,10) || '',
      current_company_name: candidate.current_company_name || '',
      last_company_designation: candidate.last_company_designation || '',
      qualification: candidate.qualification || '', location: candidate.location || '',
      total_experience: candidate.total_experience ?? undefined,
      relevant_experience: candidate.relevant_experience ?? undefined,
      skills: (candidate.skills || []).join(', '),
      current_salary: candidate.current_salary ?? undefined,
      expected_salary: candidate.expected_salary ?? undefined,
      notice_period: candidate.notice_period ?? undefined,
      immediate_joiner: candidate.immediate_joiner ?? false,
      expected_joining_date: candidate.expected_joining_date?.slice(0,10) || '',
      own_vehicle: candidate.own_vehicle ?? false,
      source: candidate.source || '', reference_source: candidate.reference_source || '',
      remarks: candidate.remarks || '',
    } : { immediate_joiner: false, own_vehicle: false });
  }, [open, candidate, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const p = {
        candidate_name: data.candidate_name, email: data.email || null,
        phone_number: data.phone_number || null, gender: (data.gender || null) as any,
        date_of_birth: data.date_of_birth || null, current_company_name: data.current_company_name || null,
        last_company_designation: data.last_company_designation || null, qualification: data.qualification || null,
        location: data.location || null, total_experience: data.total_experience ?? null,
        relevant_experience: data.relevant_experience ?? null,
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : null,
        current_salary: data.current_salary ?? null, expected_salary: data.expected_salary ?? null,
        notice_period: data.notice_period ?? null, immediate_joiner: data.immediate_joiner ?? false,
        expected_joining_date: data.expected_joining_date || null, own_vehicle: data.own_vehicle ?? false,
        source: (data.source || null) as any, reference_source: data.reference_source || null,
        remarks: data.remarks || null,
      };
      return isEdit ? candidateService.update(candidate!.id, p) : candidateService.create(p as any);
    },
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['candidates'] }); showToast(`✓ ${res.data.candidate_name} ${isEdit ? 'updated' : 'added'}`); onClose(); },
    onError: (err: any) => showToast(err?.message || 'Save failed'),
  });

  const resumeMutation = useMutation({
    mutationFn: (file: File) => candidateService.uploadResume(candidate!.id, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['candidates'] }); showToast('✓ Resume uploaded'); },
    onError: (err: any) => showToast(err?.message || 'Upload failed'),
  });

  const Err = ({ f }: { f: keyof FormData }) => errors[f] ? <span className="err">{errors[f]!.message as string}</span> : null;

  const cur = Number(watch('current_salary') || 0);
  const exp = Number(watch('expected_salary') || 0);
  const hike = cur > 0 && exp > 0 ? (((exp - cur) / cur) * 100).toFixed(1) : null;

  return (
    <Modal open={open} onClose={onClose}
      title={isEdit ? `Edit — ${candidate?.candidate_name}` : 'Add Candidate'}
      subtitle="All fields in one form · Only name is required"
      width={680}
      footer={<>
        <button className="btn btn-sec" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" onClick={handleSubmit(d => saveMutation.mutate(d))} disabled={saveMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {saveMutation.isPending && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />}
          {saveMutation.isPending ? 'Saving…' : isEdit ? '✓ Save Changes' : '✓ Add Candidate'}
        </button>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Section title="Personal" />
        <div className="fg" style={{ gridColumn: '1 / -1' }}>
          <label>Full Name *</label>
          <input placeholder="Priya Sharma" {...register('candidate_name')} autoFocus />
          <Err f="candidate_name" />
        </div>
        <div className="fg"><label>Email</label><input type="email" placeholder="priya@gmail.com" {...register('email')} /><Err f="email" /></div>
        <div className="fg"><label>Phone</label><input type="tel" placeholder="+91 98765 43210" {...register('phone_number')} /><Err f="phone_number" /></div>
        <div className="fg"><label>Gender</label><select {...register('gender')}><option value="">— Select —</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></div>
        <div className="fg"><label>Date of Birth</label><input type="date" {...register('date_of_birth')} /></div>
        <div className="fg"><label>Location</label><input placeholder="Bengaluru, Karnataka" {...register('location')} /></div>
        <div className="fg"><label>Qualification</label><input placeholder="B.E. Computer Science" {...register('qualification')} /></div>

        <Section title="Professional" />
        <div className="fg"><label>Current Company</label><input placeholder="Infosys, TCS…" {...register('current_company_name')} /></div>
        <div className="fg"><label>Last Designation</label><input placeholder="Senior Engineer" {...register('last_company_designation')} /></div>
        <div className="fg"><label>Total Experience (yrs)</label><input type="number" step="0.5" min="0" max="60" placeholder="4.5" {...register('total_experience', { valueAsNumber: true })} /><Err f="total_experience" /></div>
        <div className="fg"><label>Relevant Experience (yrs)</label><input type="number" step="0.5" min="0" max="60" placeholder="3.0" {...register('relevant_experience', { valueAsNumber: true })} /></div>
        <div className="fg" style={{ gridColumn: '1 / -1' }}><label>Skills <span style={{ fontSize: 10, color: 'var(--ink4)' }}>comma-separated</span></label><input placeholder="React, Node.js, MySQL, Docker" {...register('skills')} /></div>

        <Section title="Compensation & Availability" />
        <div className="fg"><label>Current Salary (₹/mo)</label><input type="number" min="0" placeholder="75000" {...register('current_salary', { valueAsNumber: true })} /></div>
        <div className="fg"><label>Expected Salary (₹/mo)</label><input type="number" min="0" placeholder="90000" {...register('expected_salary', { valueAsNumber: true })} /></div>

        {hike !== null && (
          <div style={{ gridColumn: '1 / -1', background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 11, display: 'flex', gap: 20 }}>
            <span>CTC: <strong>₹{(cur*12/100000).toFixed(2)}L</strong></span>
            <span>Expected: <strong>₹{(exp*12/100000).toFixed(2)}L</strong></span>
            <span>Hike: <strong style={{ color: Number(hike)>=0?'var(--green)':'var(--red)' }}>{Number(hike)>=0?'+':''}{hike}%</strong></span>
          </div>
        )}

        <div className="fg"><label>Notice Period (days)</label><input type="number" min="0" placeholder="30" {...register('notice_period', { valueAsNumber: true })} /></div>
        <div className="fg"><label>Expected Joining Date</label><input type="date" min={today} {...register('expected_joining_date')} /><Err f="expected_joining_date" /></div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}><input type="checkbox" {...register('immediate_joiner')} style={{ width: 14, height: 14, accentColor: 'var(--blue)', cursor: 'pointer' }} /> ⚡ Immediate Joiner</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}><input type="checkbox" {...register('own_vehicle')} style={{ width: 14, height: 14, accentColor: 'var(--blue)', cursor: 'pointer' }} /> 🚗 Owns Vehicle</label>
        </div>

        <Section title="Sourcing" />
        <div className="fg"><label>Source</label><select {...register('source')}><option value="">— Select —</option>{ALL_SOURCES.map(s => <option key={s} value={s}>{SOURCE_EMOJI[s]} {s}</option>)}</select></div>
        <div className="fg"><label>Reference / Campaign</label><input placeholder="Who referred or which posting" {...register('reference_source')} /></div>
        <div className="fg" style={{ gridColumn: '1 / -1' }}><label>Remarks</label><textarea rows={2} placeholder="Notes about this candidate…" style={{ resize: 'vertical' }} {...register('remarks')} /></div>

        {isEdit && (
          <>
            <Section title="Resume" />
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
              {candidate?.resume_url && <a href={`http://localhost:5000${candidate.resume_url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>📄 View current →</a>}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) resumeMutation.mutate(f); }} />
              <button type="button" className="btn btn-sec btn-sm" onClick={() => fileRef.current?.click()} disabled={resumeMutation.isPending}>
                {resumeMutation.isPending ? 'Uploading…' : candidate?.resume_url ? '↑ Replace Resume' : '↑ Upload Resume'}
              </button>
              <span style={{ fontSize: 10, color: 'var(--ink4)' }}>PDF, DOC, DOCX · max 10 MB</span>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
