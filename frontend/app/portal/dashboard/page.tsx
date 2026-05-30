'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalService } from '../../../services/api/candidate.service';
import {
  STATUS_LABEL, STATUS_COLORS,
  type Candidate, type CandidateStatus,
} from '../../../features/candidates/types/candidate.types';
import { formatDate } from '../../../utils/formatters';

const PIPELINE_STEPS: CandidateStatus[] = [
  'Applied', 'Shortlisted', 'Interview_Scheduled', 'Technical',
  'HR_Round', 'Interview_Result', 'Offered', 'Hired',
];

function usePortalAuth() {
  const router  = useRouter();
  const [token,   setToken]   = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const t = localStorage.getItem('portal_token');
    if (!t) { router.replace('/portal/login'); } else { setToken(t); }
    setChecked(true);
  }, [router]);
  return { token, checked };
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

const css = `
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#f5f6f8;font-family:system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
.topbar{background:#fff;border-bottom:1px solid #e0e4ec;padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.section{max-width:760px;margin:0 auto;padding:24px 16px 80px;display:flex;flex-direction:column;gap:16px;}
.card{background:#fff;border:1px solid #e0e4ec;border-radius:12px;padding:20px 22px;box-shadow:0 1px 3px rgba(0,0,0,.06);}
.btn{display:inline-flex;align-items:center;gap:6px;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:all .12s;font-family:inherit;}
.btn-pri{background:#1e56d9;color:#fff;}
.btn-pri:hover{background:#1744b8;}
.btn-sec{background:#fff;border:1px solid #cbd5e1;color:#475569;}
.btn-grn{background:#15803d;color:#fff;}
.btn-grn:hover{background:#166534;}
.btn-ghost{background:transparent;color:#64748b;padding:6px 10px;font-size:12px;cursor:pointer;border:none;font-family:inherit;}
.btn:disabled{opacity:.45;cursor:not-allowed;}
.fg{display:flex;flex-direction:column;gap:4px;margin-bottom:14px;}
label{font-size:11px;font-weight:700;color:#475569;display:block;}
input,textarea,select{padding:8px 10px;border:1px solid #e0e4ec;border-radius:8px;font-size:12px;outline:none;font-family:inherit;width:100%;}
input:focus,textarea:focus{border-color:#1e56d9;box-shadow:0 0 0 3px rgba(30,86,217,.07);}
textarea{resize:vertical;}
.row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:12px;gap:10px;}
.row:last-child{border-bottom:none;}
.step-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
`;

export default function PortalDashboard() {
  const router = useRouter();
  const qc     = useQueryClient();
  const { token, checked } = usePortalAuth();

  const [reschedModal,  setReschedModal]  = useState(false);
  const [reschedReason, setReschedReason] = useState('');
  const [reschedDate,   setReschedDate]   = useState('');
  const [reschedTime,   setReschedTime]   = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['portal-profile'],
    queryFn:  () => portalService.getProfile(),
    enabled:  !!token,
    select:   r => r.data,
    retry:    1,
  });

  const respondMutation = useMutation({
    mutationFn: (accepted: boolean) => portalService.respondInterview(accepted),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['portal-profile'] }),
  });

  const reschedMutation = useMutation({
    mutationFn: () => portalService.requestReschedule(reschedReason, reschedDate || undefined, reschedTime || undefined),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['portal-profile'] });
      setReschedModal(false);
      setReschedReason(''); setReschedDate(''); setReschedTime('');
    },
  });

  const logout = () => { localStorage.removeItem('portal_token'); router.push('/portal/login'); };

  if (!checked) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: '100vh', background: '#f5f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#94a3b8' }}>Loading…</div>
    </>
  );

  if (isLoading || !profile) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: '100vh', background: '#f5f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#94a3b8' }}>Loading your profile…</div>
    </>
  );

  const c = profile as Candidate;
  const statusColor  = STATUS_COLORS[c.status as CandidateStatus];
  const stepIdx      = PIPELINE_STEPS.indexOf(c.status as CandidateStatus);
  const isTerminal   = ['Rejected', 'Withdrawn', 'On_Hold'].includes(c.status);

  // ─── The three visibility rules ───────────────────────────────────────────
  // 1. Aptitude test  → show if HR sent it (aptitude_test_sent = true) and not yet attempted
  const showAptitudeTest = !!c.aptitude_test_sent && !c.aptitude_attempted_at;

  // 2. Pre-interview form → show if interview is scheduled AND candidate accepted it
  //    AND HR clicked "Send Pre-Interview Form" (pre_interview_form_sent = true)
  const showPreInterviewForm = !!c.pre_interview_form_sent
    && c.status === 'Interview_Scheduled'
    && c.interview_accepted === true;

  // 3. Pre-joining form → show when HR sent the offer (pre_joining_form_sent = true)
  const showPreJoinForm = !!c.pre_joining_form_sent;

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: '100vh', background: '#f5f6f8' }}>

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1e56d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>NX</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1623' }}>Candidate Portal</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>NexHR ERP</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>👤 {c.candidate_name}</span>
            <button className="btn-ghost" onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="section">

          {/* ── Status card ─────────────────────────────────── */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: isTerminal ? 16 : 24 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0f1623', marginBottom: 4 }}>Hello, {c.candidate_name.split(' ')[0]} 👋</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Track your application status below.</div>
              </div>
              {statusColor && (
                <span style={{ display: 'inline-flex', alignItems: 'center', background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}`, borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>
                  {STATUS_LABEL[c.status as CandidateStatus] || c.status}
                </span>
              )}
            </div>

            {/* Pipeline tracker */}
            {!isTerminal && (
              <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
                {PIPELINE_STEPS.map((step, idx) => {
                  const isDone = stepIdx > idx;
                  const isCurr = stepIdx === idx;
                  const col    = STATUS_COLORS[step];
                  return (
                    <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {idx < PIPELINE_STEPS.length - 1 && (
                        <div style={{ position: 'absolute', left: '50%', top: 14, width: '100%', height: 2, background: isDone ? '#1e56d9' : '#e0e4ec', zIndex: 0 }} />
                      )}
                      <div className="step-dot" style={{
                        zIndex: 1,
                        background: isDone ? '#1e56d9' : isCurr ? (col?.bg || '#eef3fd') : '#f5f6f8',
                        border: `2px solid ${isDone ? '#1e56d9' : isCurr ? (col?.text || '#1e56d9') : '#e0e4ec'}`,
                        color: isDone ? '#fff' : isCurr ? (col?.text || '#1e56d9') : '#94a3b8',
                      }}>
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 8, textAlign: 'center', color: isDone ? '#1e56d9' : isCurr ? (col?.text || '#1e56d9') : '#94a3b8', fontWeight: isCurr ? 700 : 400, maxWidth: 50, lineHeight: 1.3 }}>
                        {STATUS_LABEL[step] || step}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isTerminal && (
              <div style={{
                padding: '12px 14px', borderRadius: 8, fontSize: 12,
                background: c.status === 'On_Hold' ? '#fef3c7' : c.status === 'Rejected' || c.status === 'Withdrawn' ? '#fee2e2' : '#dcfce7',
                border: `1px solid ${c.status === 'On_Hold' ? '#fcd34d' : c.status === 'Rejected' || c.status === 'Withdrawn' ? '#fca5a5' : '#86efac'}`,
                color: c.status === 'On_Hold' ? '#92400e' : c.status === 'Rejected' || c.status === 'Withdrawn' ? '#991b1b' : '#15803d',
              }}>
                {c.status === 'Hired'
                  ? '🎉 Congratulations! You have been hired. HR will contact you shortly.'
                  : c.status === 'On_Hold'
                  ? '⏸ Your application is currently on hold. HR will contact you soon.'
                  : 'Thank you for your interest. We will keep your profile for future opportunities.'}
              </div>
            )}
          </div>

          {/* ── Interview card ───────────────────────────────── */}
          {!isTerminal && c.status === 'Interview_Scheduled' && c.interview_date && (
            <div className="card" style={{ borderColor: '#c7d9fb' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed', marginBottom: 14 }}>📅 Interview Scheduled</div>

              <div className="g2" style={{ marginBottom: 14 }}>
                {[
                  { label: 'Date',    value: formatDate(c.interview_date) },
                  { label: 'Time',    value: c.interview_time || '—' },
                  { label: 'Format',  value: c.interview_type || '—' },
                  { label: 'Link',    value: c.interview_link
                    ? <a href={c.interview_link} target="_blank" rel="noopener noreferrer" style={{ color: '#1e56d9', fontWeight: 600 }}>Join Meeting →</a>
                    : '—' },
                ].map(row => (
                  <div key={row.label} style={{ background: '#f5f6f8', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>{row.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0f1623' }}>{row.value}</div>
                  </div>
                ))}
              </div>

              {c.interview_instructions && (
                <div style={{ background: '#eef3fd', border: '1px solid #c7d9fb', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1e56d9', marginBottom: 14 }}>
                  📋 {c.interview_instructions}
                </div>
              )}

              {/* Candidate response */}
              {c.interview_accepted === null && !c.reschedule_requested && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f1623', marginBottom: 10 }}>Please confirm your attendance:</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-grn" onClick={() => respondMutation.mutate(true)} disabled={respondMutation.isPending}>
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
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                  ✓ Accepted — you have confirmed attendance for this interview.
                </div>
              )}

              {c.interview_accepted === false && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
                  ✗ Declined — HR has been notified.
                </div>
              )}

              {c.reschedule_requested && (
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                  🔄 Reschedule {c.reschedule_status === 'Pending' ? 'requested — pending HR review' : c.reschedule_status === 'Approved' ? 'approved ✓' : 'not approved'}.
                  {c.reschedule_status === 'Approved' && c.interview_date && <span> New date: <strong>{formatDate(c.interview_date)}</strong></span>}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              RULE 1: Aptitude Test
              Show ONLY when HR has sent it (aptitude_test_sent=true)
              and candidate has NOT yet attempted it
              ══════════════════════════════════════════════════════ */}
          {!isTerminal && showAptitudeTest && (
            <div className="card" style={{ borderColor: '#c7d9fb', borderLeftWidth: 4, borderLeftColor: '#7c3aed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1623', marginBottom: 4 }}>🧠 Aptitude Test Assigned</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                    HR has assigned an aptitude assessment. Please complete it at your earliest convenience.
                    <br />
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      Your score will <strong>not</strong> be shown to you — HR reviews results privately.
                    </span>
                  </div>
                </div>
                <button className="btn btn-pri" onClick={() => router.push('/portal/test/1')}>
                  Start Test →
                </button>
              </div>
            </div>
          )}

          {/* Aptitude completed notice */}
          {!isTerminal && c.aptitude_attempted_at && (
            <div className="card" style={{ borderColor: '#86efac' }}>
              <div style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>
                ✓ Aptitude test completed on {formatDate(c.aptitude_attempted_at)}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Results are being reviewed by HR and will be communicated to you.
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              RULE 2: Pre-Interview Form
              Show ONLY when:
              - interview is scheduled (status = Interview_Scheduled)
              - candidate accepted (interview_accepted = true)
              - HR clicked "Send Pre-Interview Form" (pre_interview_form_sent = true)
              ══════════════════════════════════════════════════════ */}
          {!isTerminal && showPreInterviewForm && (
            <div className="card" style={{ borderColor: '#fcd34d', borderLeftWidth: 4, borderLeftColor: '#f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1623', marginBottom: 4 }}>
                    📋 Pre-Interview Declaration Form
                    {c.preinterview_form_status === 'Submitted' && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#15803d', fontWeight: 600 }}>✓ Submitted</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                    Please complete this form before your interview.
                    {c.preinterview_form_status === 'Draft' && (
                      <span style={{ color: '#92400e', marginLeft: 4 }}>Draft saved — please finish and submit.</span>
                    )}
                  </div>
                </div>
                <button
                  className="btn"
                  style={{
                    background: c.preinterview_form_status === 'Submitted' ? '#f5f6f8' : '#f59e0b',
                    color: c.preinterview_form_status === 'Submitted' ? '#475569' : '#fff',
                    border: c.preinterview_form_status === 'Submitted' ? '1px solid #e0e4ec' : 'none',
                    flexShrink: 0,
                  }}
                  onClick={() => router.push('/portal/preinterview')}
                >
                  {c.preinterview_form_status === 'Submitted' ? 'View Submitted Form' : c.preinterview_form_status === 'Draft' ? 'Continue Form' : 'Start Form →'}
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              RULE 3: Pre-Joining Form
              Show ONLY when HR sent the offer (pre_joining_form_sent = true)
              ══════════════════════════════════════════════════════ */}
          {!isTerminal && showPreJoinForm && (
            <div className="card" style={{ borderColor: '#86efac', borderLeftWidth: 4, borderLeftColor: '#15803d' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1623', marginBottom: 4 }}>
                    📝 Pre-Joining Form
                    {c.preinterview_form_status === 'Submitted' && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#15803d', fontWeight: 600 }}>✓ Submitted</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                    Complete your pre-joining details to finalise your onboarding.
                    {c.prejoining_submitted_at && (
                      <span style={{ color: '#15803d', marginLeft: 4 }}>Submitted on {formatDate(c.prejoining_submitted_at)}.</span>
                    )}
                  </div>
                </div>
                <button className="btn btn-grn" style={{ flexShrink: 0 }} onClick={() => router.push('/portal/prejoining')}>
                  {c.prejoining_form_status === 'Submitted' ? 'View Form' : c.prejoining_form_status === 'Draft' ? 'Continue Form' : 'Start Form →'}
                </button>
              </div>

              {/* Offer summary */}
              {c.offered_ctc && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                  <div className="g2">
                    {[
                      { label: 'Offered CTC',   value: `₹${Number(c.offered_ctc).toLocaleString('en-IN')}/mo` },
                      { label: 'Joining Date',  value: c.confirmed_joining_date ? formatDate(c.confirmed_joining_date) : '—' },
                    ].map(r => (
                      <div key={r.label} style={{ background: '#f5f6f8', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>{r.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1623' }}>{r.value}</div>
                      </div>
                    ))}
                  </div>
                  {c.offer_letter_url && (
                    <div style={{ marginTop: 10 }}>
                      <a href={c.offer_letter_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1e56d9', fontSize: 12, fontWeight: 600 }}>
                        📄 View Offer Letter →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Profile summary ──────────────────────────────── */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1623', marginBottom: 12 }}>Your Profile</div>
            {[
              ['Email',       c.email],
              ['Phone',       c.phone_number],
              ['Experience',  c.total_experience ? `${c.total_experience} years` : null],
              ['Company',     c.current_company_name],
              ['Location',    c.location],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string} className="row">
                <span style={{ color: '#94a3b8' }}>{label}</span>
                <span style={{ fontWeight: 600, color: '#0f1623' }}>{value}</span>
              </div>
            ))}
          </div>

        </div>

        {/* ── Reschedule overlay ───────────────────────────── */}
        {!isTerminal && reschedModal && (
          <Overlay onClose={() => setReschedModal(false)}>
            <div style={{ background: '#fff', border: '1px solid #e0e4ec', borderRadius: 12, padding: '24px 28px', width: 440, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#0f1623' }}>🔄 Request Reschedule</div>
              <div className="fg">
                <label>Reason *</label>
                <textarea rows={3} placeholder="Why do you need to reschedule?" value={reschedReason} onChange={e => setReschedReason(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fg">
                  <label>Preferred Date</label>
                  <input type="date" min={new Date().toISOString().slice(0, 10)} value={reschedDate} onChange={e => setReschedDate(e.target.value)} />
                </div>
                <div className="fg">
                  <label>Preferred Time</label>
                  <input type="time" value={reschedTime} onChange={e => setReschedTime(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button className="btn btn-sec" onClick={() => setReschedModal(false)}>Cancel</button>
                <button className="btn btn-pri" onClick={() => reschedMutation.mutate()} disabled={!reschedReason || reschedMutation.isPending}>
                  {reschedMutation.isPending ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          </Overlay>
        )}
      </div>
    </>
  );
}
