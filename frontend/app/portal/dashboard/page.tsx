'use client';
import { useEffect, useState } from 'react';
import { useRouter }   from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalService } from '../../../features/candidates/candidate.service';
import { STATUS_LABEL, STATUS_COLORS, type Candidate, type CandidateStatus } from '../../../features/candidates/types/candidate.types';
import { formatDate }  from '../../../utils/formatters';

const PIPELINE_STEPS: CandidateStatus[] = ['Applied','Shortlisted','Interview_Scheduled','Technical','HR_Round','Offered','Hired'];

// Mini portal auth hook
function usePortalAuth() {
  const router = useRouter();
  const token  = typeof window !== 'undefined' ? localStorage.getItem('portal_token') : null;

  useEffect(() => {
    if (!token) router.replace('/portal/login');
  }, [token, router]);

  return { token };
}

export default function PortalDashboard() {
  const router = useRouter();
  const qc     = useQueryClient();
  const { token } = usePortalAuth();

  const [reschedModal, setReschedModal] = useState(false);
  const [reschedReason, setReschedReason] = useState('');
  const [reschedDate, setReschedDate]   = useState('');
  const [reschedTime, setReschedTime]   = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['portal-profile'],
    queryFn:  () => portalService.getProfile(),
    enabled:  !!token,
    select:   (res) => res.data,
  });

  const respondMutation = useMutation({
    mutationFn: (accepted: boolean) => portalService.respondInterview(accepted),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-profile'] }); },
  });

  const reschedMutation = useMutation({
    mutationFn: () => portalService.requestReschedule(reschedReason, reschedDate || undefined, reschedTime || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-profile'] }); setReschedModal(false); setReschedReason(''); setReschedDate(''); setReschedTime(''); },
  });

  const logout = () => { localStorage.removeItem('portal_token'); router.push('/portal/login'); };

  if (isLoading || !profile) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', color: 'var(--ink4)', fontSize: 13 }}>Loading your profile…</div>;
  }

  const c = profile as Candidate;
  const currentStepIndex = PIPELINE_STEPS.indexOf(c.status as CandidateStatus);
  const isTerminal = ['Rejected','Withdrawn','On_Hold'].includes(c.status);
  const statusColor = STATUS_COLORS[c.status as CandidateStatus];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', fontSize: 13 }}>

      {/* Top bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>NX</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Candidate Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--ink4)' }}>👤 {c.candidate_name}</span>
          <button onClick={logout} className="btn btn-ghost btn-sm">Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 16px' }}>

        {/* Status hero */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '24px 28px', marginBottom: 20, boxShadow: 'var(--sh)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Hello, {c.candidate_name.split(' ')[0]} 👋</div>
              <div style={{ fontSize: 12, color: 'var(--ink4)' }}>Your application is being reviewed by our team.</div>
            </div>
            {statusColor && (
              <span style={{ display: 'inline-flex', alignItems: 'center', background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}`, borderRadius: 99, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>
                {STATUS_LABEL[c.status as CandidateStatus] || c.status}
              </span>
            )}
          </div>

          {/* Pipeline tracker */}
          {!isTerminal && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                {PIPELINE_STEPS.map((step, idx) => {
                  const isDone = currentStepIndex > idx;
                  const isCurr = currentStepIndex === idx;
                  const stepColor = STATUS_COLORS[step];
                  return (
                    <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {/* Connector line */}
                      {idx < PIPELINE_STEPS.length - 1 && (
                        <div style={{ position: 'absolute', left: '50%', top: 14, width: '100%', height: 2, background: isDone ? 'var(--blue)' : 'var(--border)', zIndex: 0 }} />
                      )}
                      {/* Circle */}
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', zIndex: 1,
                        background: isDone ? 'var(--blue)' : isCurr ? stepColor?.bg || 'var(--blue-lt)' : 'var(--surface2)',
                        border: `2px solid ${isDone ? 'var(--blue)' : isCurr ? stepColor?.text || 'var(--blue)' : 'var(--border2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                        color: isDone ? '#fff' : isCurr ? stepColor?.text || 'var(--blue)' : 'var(--ink4)',
                      }}>
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 9, textAlign: 'center', color: isDone ? 'var(--blue)' : isCurr ? stepColor?.text || 'var(--blue)' : 'var(--ink4)', fontWeight: isCurr ? 700 : 400, maxWidth: 64 }}>
                        {STATUS_LABEL[step] || step}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isTerminal && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: c.status === 'Hired' ? 'var(--green-lt)' : 'var(--red-lt)', border: `1px solid ${c.status === 'Hired' ? 'var(--green-bd)' : 'var(--red-bd)'}`, borderRadius: 'var(--r)', fontSize: 12, color: c.status === 'Hired' ? 'var(--green)' : 'var(--red)' }}>
              {c.status === 'Hired' ? '🎉 Congratulations! You have been selected. HR will contact you with further details.' : 'Thank you for your interest. We will keep your profile for future opportunities.'}
            </div>
          )}
        </div>

        {/* Interview card */}
        {c.status === 'Interview_Scheduled' && c.interview_date && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--purple-bd)', borderRadius: 'var(--r3)', padding: '20px 24px', marginBottom: 20, boxShadow: 'var(--sh)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--purple)', marginBottom: 14 }}>📅 Interview Scheduled</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Date',   value: formatDate(c.interview_date) },
                { label: 'Time',   value: c.interview_time || '—' },
                { label: 'Format', value: c.interview_type || '—' },
                { label: 'Link',   value: c.interview_link ? <a href={c.interview_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', fontWeight: 600 }}>Join Meeting →</a> : '—' },
              ].map(row => (
                <div key={row.label} style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 3 }}>{row.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{row.value}</div>
                </div>
              ))}
            </div>

            {c.interview_instructions && (
              <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--blue)', marginBottom: 16 }}>
                📋 {c.interview_instructions}
              </div>
            )}

            {/* Candidate response */}
            {c.interview_accepted === null && !c.reschedule_requested && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Your response:</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-pri" style={{ background: 'var(--green)' }} onClick={() => respondMutation.mutate(true)} disabled={respondMutation.isPending}>
                    ✓ Accept Interview
                  </button>
                  <button className="btn btn-sec" onClick={() => respondMutation.mutate(false)} disabled={respondMutation.isPending}>
                    ✗ Cannot Attend
                  </button>
                  <button className="btn btn-sec" onClick={() => setReschedModal(true)} disabled={respondMutation.isPending}>
                    🔄 Request Reschedule
                  </button>
                </div>
              </div>
            )}

            {c.interview_accepted === true && (
              <div style={{ background: 'var(--green-lt)', border: '1px solid var(--green-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                ✓ You have accepted this interview. Best of luck!
              </div>
            )}

            {c.interview_accepted === false && (
              <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
                ✗ You declined this interview. HR will be notified.
              </div>
            )}

            {c.reschedule_requested && (
              <div style={{ background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>
                🔄 Reschedule request submitted ({c.reschedule_status || 'Pending'}). HR will review and confirm.
              </div>
            )}
          </div>
        )}

        {/* Pre-joining form card */}
        {(c.status === 'Offered' || c.status === 'Hired') && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '20px 24px', marginBottom: 20, boxShadow: 'var(--sh)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>📋 Pre-joining Form</div>
            <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 14 }}>
              Status: <strong style={{ color: c.prejoin_form_status === 'Submitted' ? 'var(--green)' : 'var(--amber)' }}>
                {c.prejoin_form_status === 'Submitted' ? '✓ Submitted' : c.prejoin_form_status === 'Draft' ? 'Draft saved' : 'Not started'}
              </strong>
            </div>
            <button className="btn btn-pri btn-sm" onClick={() => router.push('/portal/prejoin')}>
              {c.prejoin_form_status === 'Submitted' ? 'View Submitted Form' : c.prejoin_form_status === 'Draft' ? 'Continue Form' : 'Start Form'}
            </button>
          </div>
        )}

        {/* Aptitude test card */}
        {!c.aptitude_attempted_at && (c.status === 'Applied' || c.status === 'Shortlisted') && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '20px 24px', marginBottom: 20, boxShadow: 'var(--sh)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>🧠 Aptitude Test</div>
            <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 14 }}>Complete the aptitude assessment to move forward in the process.</div>
            <button className="btn btn-pri btn-sm" onClick={() => router.push('/portal/test/1')}>Start Test →</button>
          </div>
        )}

        {c.aptitude_attempted_at && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--green-bd)', borderRadius: 'var(--r3)', padding: '16px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>✓ Aptitude test completed on {formatDate(c.aptitude_attempted_at)}</div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>Results will be communicated by HR.</div>
          </div>
        )}
      </div>

      {/* Reschedule modal */}
      {reschedModal && (
        <div className="modal-bg" onClick={() => setReschedModal(false)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '24px 28px', width: 420, maxWidth: '95vw', boxShadow: 'var(--sh3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🔄 Request Reschedule</div>
            <div className="fg"><label>Reason *</label><textarea rows={3} placeholder="Please explain why you need to reschedule…" value={reschedReason} onChange={e => setReschedReason(e.target.value)} style={{ resize: 'vertical' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="fg"><label>Preferred Date</label><input type="date" min={new Date().toISOString().slice(0,10)} value={reschedDate} onChange={e => setReschedDate(e.target.value)} /></div>
              <div className="fg"><label>Preferred Time</label><input type="time" value={reschedTime} onChange={e => setReschedTime(e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn btn-sec" onClick={() => setReschedModal(false)}>Cancel</button>
              <button className="btn btn-pri" onClick={() => reschedMutation.mutate()} disabled={!reschedReason || reschedMutation.isPending}>
                {reschedMutation.isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
