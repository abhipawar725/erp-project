'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalService } from '../../../services/api/candidate.service';

type FormData = Record<string, string | boolean>;

const STEPS = [
  { id: 'personal',    label: '👤 Personal',    icon: '👤' },
  { id: 'education',   label: '🎓 Education',   icon: '🎓' },
  { id: 'address',     label: '📍 Address',     icon: '📍' },
  { id: 'experience',  label: '💼 Experience',  icon: '💼' },
  { id: 'bank',        label: '🏦 Bank Details', icon: '🏦' },
  { id: 'declaration', label: '✅ Declaration',  icon: '✅' },
];

function usePortalAuth() {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('portal_token') : null;
  useEffect(() => { if (!token) router.replace('/portal/login'); }, [token, router]);
  return { token };
}

const FG = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <div className="fg">
    <label>{label}{required && ' *'}</label>
    {children}
  </div>
);

export default function PrejoinFormPage() {
  const router = useRouter();
  const qc     = useQueryClient();
  usePortalAuth();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (key: string, value: string | boolean) => setData(d => ({ ...d, [key]: value }));
  const val = (key: string, fallback = '') => (data[key] as string) || fallback;

  // Load existing draft
  const { data: profile } = useQuery({
    queryKey: ['portal-profile'],
    queryFn:  () => portalService.getProfile(),
    select:   (r) => r.data,
  });

  useEffect(() => {
    if (profile?.prejoin_form_data) {
      setData(profile.prejoin_form_data as FormData);
    }
    if (profile?.prejoin_form_status === 'Submitted') {
      setSubmitted(true);
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (isDraft: boolean) => portalService.savePrejoin(data, isDraft),
    onSuccess: (_, isDraft) => {
      qc.invalidateQueries({ queryKey: ['portal-profile'] });
      if (!isDraft) setSubmitted(true);
    },
  });

  const totalSteps = STEPS.length;
  const progress   = Math.round(((step + 1) / totalSteps) * 100);
  const isLast     = step === totalSteps - 1;

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '40px 48px', maxWidth: 480, textAlign: 'center', boxShadow: 'var(--sh3)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Form Submitted!</div>
        <div style={{ fontSize: 13, color: 'var(--ink4)', lineHeight: 1.7, marginBottom: 24 }}>Your pre-joining form has been submitted. HR will review and contact you with the next steps.</div>
        <button className="btn btn-pri" onClick={() => router.push('/portal/dashboard')}>← Back to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
      {/* Top bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>NX</div>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Pre-Joining Form</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sec btn-sm" onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? '…' : '💾 Save Draft'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/portal/dashboard')}>Dashboard</button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

        {/* Progress bar */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
            <span style={{ fontWeight: 700 }}>Step {step + 1} of {totalSteps}: {STEPS[step].label}</span>
            <span style={{ color: 'var(--ink4)' }}>{progress}% complete</span>
          </div>
          <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--blue)', borderRadius: 99, transition: 'width .3s' }} />
          </div>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
            {STEPS.map((s, i) => (
              <button key={s.id} type="button" onClick={() => setStep(i)} style={{ padding: '3px 10px', border: `1px solid ${i === step ? 'var(--blue)' : i < step ? 'var(--green-bd)' : 'var(--border)'}`, borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: i === step ? 'var(--blue-lt)' : i < step ? 'var(--green-lt)' : 'var(--surface2)', color: i === step ? 'var(--blue)' : i < step ? 'var(--green)' : 'var(--ink4)', fontFamily: 'var(--font)' }}>
                {i < step ? '✓' : s.icon} {s.label.split(' ').slice(1).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '24px 28px', boxShadow: 'var(--sh)' }}>

          {/* Step 0 — Personal */}
          {step === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <FG label="Full Name" required><input placeholder="As per Aadhaar / Passport" value={val('full_name')} onChange={e => set('full_name', e.target.value)} /></FG>
              <FG label="Father's Name"><input placeholder="Father's full name" value={val('father_name')} onChange={e => set('father_name', e.target.value)} /></FG>
              <FG label="Date of Birth" required><input type="date" value={val('dob')} onChange={e => set('dob', e.target.value)} /></FG>
              <FG label="Gender"><select value={val('gender')} onChange={e => set('gender', e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></FG>
              <FG label="Mobile Number" required><input type="tel" placeholder="+91 98765 43210" value={val('mobile')} onChange={e => set('mobile', e.target.value)} /></FG>
              <FG label="Emergency Contact"><input type="tel" placeholder="Emergency contact number" value={val('emergency_contact')} onChange={e => set('emergency_contact', e.target.value)} /></FG>
              <FG label="Blood Group"><select value={val('blood_group')} onChange={e => set('blood_group', e.target.value)}><option value="">Select</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}</select></FG>
              <FG label="Marital Status"><select value={val('marital_status')} onChange={e => set('marital_status', e.target.value)}><option value="">Select</option><option>Single</option><option>Married</option><option>Divorced</option></select></FG>
              <FG label="Aadhaar Number"><input placeholder="XXXX XXXX XXXX" maxLength={14} value={val('aadhaar')} onChange={e => set('aadhaar', e.target.value)} /></FG>
              <FG label="PAN Number"><input placeholder="ABCDE1234F" maxLength={10} style={{ textTransform: 'uppercase' }} value={val('pan')} onChange={e => set('pan', e.target.value.toUpperCase())} /></FG>
            </div>
          )}

          {/* Step 1 — Education */}
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <FG label="Highest Qualification" required><select value={val('highest_qualification')} onChange={e => set('highest_qualification', e.target.value)}><option value="">Select</option><option>10th</option><option>12th</option><option>Diploma</option><option>B.E. / B.Tech</option><option>B.Sc</option><option>BCA</option><option>B.Com</option><option>MBA</option><option>MCA</option><option>M.Tech</option><option>Ph.D</option><option>Other</option></select></FG>
              <FG label="Field of Study"><input placeholder="Computer Science, Finance…" value={val('field_of_study')} onChange={e => set('field_of_study', e.target.value)} /></FG>
              <FG label="Institution / University" required><input placeholder="University or college name" value={val('institution')} onChange={e => set('institution', e.target.value)} /></FG>
              <FG label="Year of Passing"><input type="number" min="1980" max={new Date().getFullYear()} value={val('pass_year')} onChange={e => set('pass_year', e.target.value)} /></FG>
              <FG label="Percentage / CGPA"><input type="text" placeholder="e.g. 8.5 CGPA or 82%" value={val('percentage')} onChange={e => set('percentage', e.target.value)} /></FG>
              <FG label="Additional Certifications"><textarea rows={2} placeholder="List any relevant certifications, courses…" style={{ resize: 'vertical' }} value={val('certifications')} onChange={e => set('certifications', e.target.value)} /></FG>
            </div>
          )}

          {/* Step 2 — Address */}
          {step === 2 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink4)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>Current / Residential Address</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px', marginBottom: 20 }}>
                <FG label="Address Line 1" required><input placeholder="Street, building no…" value={val('current_address1')} onChange={e => set('current_address1', e.target.value)} /></FG>
                <FG label="Address Line 2"><input placeholder="Locality, landmark…" value={val('current_address2')} onChange={e => set('current_address2', e.target.value)} /></FG>
                <FG label="City" required><input placeholder="City" value={val('current_city')} onChange={e => set('current_city', e.target.value)} /></FG>
                <FG label="State" required><input placeholder="State" value={val('current_state')} onChange={e => set('current_state', e.target.value)} /></FG>
                <FG label="PIN Code" required><input placeholder="6-digit PIN" maxLength={6} value={val('current_pin')} onChange={e => set('current_pin', e.target.value)} /></FG>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <input type="checkbox" id="same_address" checked={!!data.same_address} onChange={e => set('same_address', e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--blue)', cursor: 'pointer' }} />
                <label htmlFor="same_address" style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Permanent address is same as current address</label>
              </div>
              {!data.same_address && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink4)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>Permanent Address</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                    <FG label="Address Line 1"><input placeholder="Street, building no…" value={val('perm_address1')} onChange={e => set('perm_address1', e.target.value)} /></FG>
                    <FG label="City"><input placeholder="City" value={val('perm_city')} onChange={e => set('perm_city', e.target.value)} /></FG>
                    <FG label="State"><input placeholder="State" value={val('perm_state')} onChange={e => set('perm_state', e.target.value)} /></FG>
                    <FG label="PIN Code"><input maxLength={6} placeholder="6-digit PIN" value={val('perm_pin')} onChange={e => set('perm_pin', e.target.value)} /></FG>
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 3 — Experience */}
          {step === 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <FG label="Total Work Experience"><input type="text" placeholder="e.g. 4 years 6 months" value={val('total_exp')} onChange={e => set('total_exp', e.target.value)} /></FG>
              <FG label="Previous Employer"><input placeholder="Company name" value={val('prev_employer')} onChange={e => set('prev_employer', e.target.value)} /></FG>
              <FG label="Previous Designation"><input placeholder="Your last role" value={val('prev_designation')} onChange={e => set('prev_designation', e.target.value)} /></FG>
              <FG label="Last Working Day"><input type="date" value={val('last_working_day')} onChange={e => set('last_working_day', e.target.value)} /></FG>
              <FG label="Last Drawn Salary (₹/mo)"><input type="number" min="0" placeholder="Monthly take-home" value={val('last_salary')} onChange={e => set('last_salary', e.target.value)} /></FG>
              <FG label="Reason for Leaving"><input placeholder="Relocation, growth, etc." value={val('leaving_reason')} onChange={e => set('leaving_reason', e.target.value)} /></FG>
              <FG label="Reference Name"><input placeholder="Manager or HR name from previous employer" value={val('reference_name')} onChange={e => set('reference_name', e.target.value)} /></FG>
              <FG label="Reference Contact"><input placeholder="Email or phone" value={val('reference_contact')} onChange={e => set('reference_contact', e.target.value)} /></FG>
            </div>
          )}

          {/* Step 4 — Bank */}
          {step === 4 && (
            <>
              <div style={{ background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--amber)', marginBottom: 16 }}>
                🔒 Bank details are collected for payroll processing. This information is kept strictly confidential.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                <FG label="Account Holder Name"><input placeholder="Name as per bank records" value={val('account_name')} onChange={e => set('account_name', e.target.value)} /></FG>
                <FG label="Bank Name"><input placeholder="HDFC, SBI, ICICI…" value={val('bank_name')} onChange={e => set('bank_name', e.target.value)} /></FG>
                <FG label="Account Number"><input placeholder="Your account number" value={val('account_number')} onChange={e => set('account_number', e.target.value)} /></FG>
                <FG label="IFSC Code"><input placeholder="HDFC0001234" style={{ textTransform: 'uppercase' }} value={val('ifsc')} onChange={e => set('ifsc', e.target.value.toUpperCase())} /></FG>
                <FG label="Branch"><input placeholder="Branch name / city" value={val('branch')} onChange={e => set('branch', e.target.value)} /></FG>
                <FG label="Account Type"><select value={val('account_type')} onChange={e => set('account_type', e.target.value)}><option value="">Select</option><option>Savings</option><option>Current</option></select></FG>
              </div>
            </>
          )}

          {/* Step 5 — Declaration */}
          {step === 5 && (
            <div>
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r2)', padding: '16px 18px', fontSize: 12, lineHeight: 1.8, color: 'var(--ink3)', marginBottom: 20, maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)' }}>
                <strong>Declaration:</strong><br/>
                I hereby declare that the information provided in this form is true and accurate to the best of my knowledge. I understand that any misrepresentation or omission may result in termination of employment without notice.<br/><br/>
                I agree to abide by the rules, regulations, and policies of the organisation. I consent to the processing of my personal data for employment-related purposes in accordance with applicable data protection laws.<br/><br/>
                I confirm that I am not bound by any agreement that would prevent me from joining this organisation, and that I have served or am committed to serving my full notice period with my previous employer.
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', background: data.declaration ? 'var(--green-lt)' : 'var(--surface2)', border: `1px solid ${data.declaration ? 'var(--green-bd)' : 'var(--border)'}`, borderRadius: 'var(--r)', transition: 'all .1s' }}>
                <input type="checkbox" checked={!!data.declaration} onChange={e => set('declaration', e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--green)', cursor: 'pointer', marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: data.declaration ? 'var(--green)' : 'var(--ink)', lineHeight: 1.5 }}>
                  I have read and agree to the declaration above. I confirm all information provided is accurate.
                </span>
              </label>

              {data.declaration && (
                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                  <FG label="Full Name (signature)" required><input placeholder="Type your full name as signature" value={val('signature_name')} onChange={e => set('signature_name', e.target.value)} /></FG>
                  <FG label="Date of Declaration"><input type="date" value={val('declaration_date') || new Date().toISOString().slice(0,10)} onChange={e => set('declaration_date', e.target.value)} /></FG>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 10 }}>
          <button className="btn btn-sec" disabled={step === 0} onClick={() => setStep(s => s - 1)}>← Previous</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sec" onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? '…' : '💾 Save Draft'}
            </button>
            {!isLast ? (
              <button className="btn btn-pri" onClick={() => setStep(s => s + 1)}>Next →</button>
            ) : (
              <button
                className="btn btn-pri"
                style={{ background: !data.declaration ? 'var(--border2)' : 'var(--green)', cursor: !data.declaration ? 'not-allowed' : 'pointer' }}
                disabled={!data.declaration || saveMutation.isPending}
                onClick={() => saveMutation.mutate(false)}
              >
                {saveMutation.isPending ? 'Submitting…' : '✓ Submit Form'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
