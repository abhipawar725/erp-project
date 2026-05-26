'use client';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../../components/ui/Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '../../../services/api/candidate.service';
import { showToast } from '../../../utils/toast';
import type { Candidate } from '../types/candidate.types';
import { ALL_SOURCES } from '../types/candidate.types';

const today = new Date().toISOString().slice(0, 10);

const emptyToUndefined = (value: unknown) => {
  if (value === '' || value === null) return undefined;
  return value;
};

const numberOrUndefined = (value: unknown) => {
  if (
    value === '' ||
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return undefined;
  }

  return Number(value);
};

const schema = z.object({
  candidate_name: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .min(1, 'Candidate name is required')
      .max(200, 'Candidate name is too long'),
  ),

  email: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .email('Please enter a valid email address')
      .optional(),
  ),

  phone_number: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(
        /^[+\d\s\-()]{7,20}$/,
        'Please enter a valid phone number',
      )
      .optional(),
  ),

  gender: z.preprocess(
    emptyToUndefined,
    z
      .enum([
        'Male',
        'Female',
        'Other',
        'Prefer not to say',
      ])
      .optional(),
  ),

  date_of_birth: z.preprocess(
    emptyToUndefined,
    z.string().optional(),
  ),

  current_company_name: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(200, 'Company name is too long')
      .optional(),
  ),

  current_company_designation: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(200, 'Designation is too long')
      .optional(),
  ),

  qualification: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(200, 'Qualification is too long')
      .optional(),
  ),

  location: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(200, 'Location is too long')
      .optional(),
  ),

  total_experience: z.preprocess(
    numberOrUndefined,
    z
      .number({
        invalid_type_error: 'Total experience must be a number',
      })
      .min(0, 'Total experience cannot be negative')
      .max(60, 'Total experience cannot exceed 60 years')
      .optional(),
  ),

  relevant_experience: z.preprocess(
    numberOrUndefined,
    z
      .number({
        invalid_type_error: 'Relevant experience must be a number',
      })
      .min(0, 'Relevant experience cannot be negative')
      .max(60, 'Relevant experience cannot exceed 60 years')
      .optional(),
  ),

  apply_department: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(200, 'Department name is too long')
      .optional(),
  ),

  apply_designation: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(200, 'Designation is too long')
      .optional(),
  ),

  current_salary: z.preprocess(
    numberOrUndefined,
    z
      .number({
        invalid_type_error: 'Current salary must be a number',
      })
      .min(0, 'Current salary cannot be negative')
      .optional(),
  ),

  expected_salary: z.preprocess(
    numberOrUndefined,
    z
      .number({
        invalid_type_error: 'Expected salary must be a number',
      })
      .min(0, 'Expected salary cannot be negative')
      .optional(),
  ),

  notice_period: z.preprocess(
    numberOrUndefined,
    z
      .number({
        invalid_type_error: 'Notice period must be a number',
      })
      .int('Notice period must be a whole number')
      .min(0, 'Notice period cannot be negative')
      .optional(),
  ),

  immediate_joiner: z.boolean().optional(),

  expected_joining_date: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(
        d => !d || d >= today,
        'Expected joining date cannot be in the past',
      )
      .optional(),
  ),

  own_vehicle: z.boolean().optional(),

  source: z.preprocess(
    emptyToUndefined,
    z.enum(ALL_SOURCES).optional(),
  ),

  reference_source: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(300, 'Reference source is too long')
      .optional(),
  ),

  remarks: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(1000, 'Remarks must be under 1000 characters')
      .optional(),
  ),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  candidate?: Candidate | null;
}

const Section = ({ title }: { title: string }) => (
  <div style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 700, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.08em', paddingBottom: 8, paddingTop: 8, marginBottom: 2 }}>
    {title}
  </div>
);

export function CandidateFormModal({ open, onClose, candidate }: Props) {
  const isEdit = !!candidate;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      immediate_joiner: false,
      own_vehicle: false,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(candidate ? {
      candidate_name: candidate.candidate_name,
      email: candidate.email || '',
      phone_number: candidate.phone_number || '',
      gender: candidate.gender ?? undefined,
      date_of_birth: candidate.date_of_birth?.slice(0, 10) || '',
      current_company_name: candidate.current_company_name || '',
      current_company_designation: candidate.current_company_designation || '',
      qualification: candidate.qualification || '',
      location: candidate.location || '',
      total_experience: candidate.total_experience ?? undefined,
      relevant_experience: candidate.relevant_experience ?? undefined,
      apply_department: candidate.apply_department ?? undefined,
      apply_designation: candidate.apply_designation ?? undefined,
      current_salary: candidate.current_salary ?? undefined,
      expected_salary: candidate.expected_salary ?? undefined,
      notice_period: candidate.notice_period ?? undefined,
      immediate_joiner: candidate.immediate_joiner ?? false,
      expected_joining_date:
        candidate.expected_joining_date?.slice(0, 10) || '',
      own_vehicle: candidate.own_vehicle ?? false,
      source: candidate.source ?? undefined,
      reference_source: candidate.reference_source || '',
      remarks: candidate.remarks || '',
    } : {
      immediate_joiner: false,
      own_vehicle: false,
    });
  }, [open, candidate, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        email: data.email || null,
        phone_number: data.phone_number || null,
        gender: data.gender || null,
        date_of_birth: data.date_of_birth || null,
        current_company_name: data.current_company_name || null,
        current_company_designation:
          data.current_company_designation || null,
        qualification: data.qualification || null,
        location: data.location || null,
        apply_department: data.apply_department || null,
        apply_designation: data.apply_designation || null,
        expected_joining_date:
          data.expected_joining_date || null,
        source: data.source || null,
        reference_source: data.reference_source || null,
        remarks: data.remarks || null,
      };
      return isEdit
        ? candidateService.update(candidate!.id, payload)
        : candidateService.create(payload as any);
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

  const cur = watch('current_salary') ?? 0;
  const exp = watch('expected_salary') ?? 0;
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
        <div className="fg"><label>Current Designation</label><input placeholder="Senior Engineer" {...register('current_company_designation')} /></div>
        <div className="fg"><label>Total Experience (yrs)</label><input type="number" step="0.5" min="0" max="60" placeholder="4.5" {...register('total_experience', { valueAsNumber: true })} /><Err f="total_experience" /></div>
        <div className="fg"><label>Relevant Experience (yrs)</label><input type="number" step="0.5" min="0" max="60" placeholder="3.0" {...register('relevant_experience', { valueAsNumber: true })} /></div>
        <div className="fg"><label>Apply Department</label><input type="text" placeholder="IT" {...register('apply_department')} /></div>
        <div className="fg"><label>Apply Designation</label><input type="text" placeholder="Backend Developer" {...register('apply_designation')} /></div>

        <Section title="Compensation & Availability" />
        <div className="fg"><label>Current Salary (₹/mo)</label><input type="number" min="0" placeholder="75000" {...register('current_salary', { valueAsNumber: true })} /></div>
        <div className="fg"><label>Expected Salary (₹/mo)</label><input type="number" min="0" placeholder="90000" {...register('expected_salary', { valueAsNumber: true })} /></div>

        {hike !== null && (
          <div style={{ gridColumn: '1 / -1', background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 11, display: 'flex', gap: 20, marginBottom: '12px' }}>
            <span>CTC: <strong>₹{(cur * 12 / 100000).toFixed(2)}L</strong></span>
            <span>Expected: <strong>₹{(exp * 12 / 100000).toFixed(2)}L</strong></span>
            <span>Hike: <strong style={{ color: Number(hike) >= 0 ? 'var(--green)' : 'var(--red)' }}>{Number(hike) >= 0 ? '+' : ''}{hike}%</strong></span>
          </div>
        )}

        <div className="fg"><label>Notice Period (days)</label><input type="number" min="0" placeholder="30" {...register('notice_period', { valueAsNumber: true })} /></div>
        <div className="fg"><label>Expected Joining Date</label><input type="date" min={today} {...register('expected_joining_date')} /><Err f="expected_joining_date" /></div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}><input type="checkbox" {...register('immediate_joiner')} style={{ width: 14, height: 14, accentColor: 'var(--blue)', cursor: 'pointer' }} /> Immediate Joiner</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}><input type="checkbox" {...register('own_vehicle')} style={{ width: 14, height: 14, accentColor: 'var(--blue)', cursor: 'pointer' }} /> Owns Vehicle</label>
        </div>

        <Section title="Sourcing" />
        <div className="fg"><label>Source</label><select {...register('source')}><option value="">— Select —</option>{ALL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="fg"><label>Reference / Campaign</label><input placeholder="Who referred or which posting" {...register('reference_source')} /></div>
        <div className="fg" style={{ gridColumn: '1 / -1' }}><label>Remarks</label><textarea rows={2} placeholder="Notes about this candidate…" style={{ resize: 'vertical' }} {...register('remarks')} /></div>

        {isEdit && (
          <>
            <Section title="Resume" />
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
              {candidate?.resume_url && <a href={`${process.env.NEXT_PUBLIC_API_URL}${candidate.resume_url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>📄 View current →</a>}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];

                  if (!f) return;

                  const ext = f.name.split('.').pop()?.toLowerCase();

                  if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
                    showToast('Only PDF, DOC, and DOCX files are allowed');
                    e.target.value = '';
                    return;
                  }

                  if (f.size > 10 * 1024 * 1024) {
                    showToast('Resume size must be under 10 MB');
                    e.target.value = '';
                    return;
                  }

                  resumeMutation.mutate(f);
                  e.target.value = '';
                }}
              />
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
