'use client';
import { useEffect, useState }  from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch }       from '../../../../store';
import { setPageTitle }         from '../../../../store/slices/uiSlice';
import { AppShell }             from '../../../../layouts/AppLayout';
import { Chip }                 from '../../../../components/ui/Chip';
import { Modal }                from '../../../../components/ui/Modal';

// Feature components
import { CandidateFormModal }      from '../../../../features/candidates/components/CandidateFormModal';
import { StatusMoveModal }         from '../../../../features/candidates/components/StatusMoveModal';
import { InterviewSchedulerModal } from '../../../../features/candidates/components/InterviewSchedulerModal';
import { InterviewResultModal }    from '../../../../features/candidates/components/InterviewResultModal';
import { OfferLetterModal }        from '../../../../features/candidates/components/OfferLetterModal';
import { HireCandidateModal }      from '../../../../features/candidates/components/HireCandidateModal';
import { WithdrawModal }           from '../../../../features/candidates/components/WithdrawModal';
import { PreInterviewFormModal }   from '../../../../features/candidates/components/PreInterviewFormModal';
import { AptitudeTestSendModal }   from '../../../../features/candidates/components/AptitudeTestSendModal';
import { GrantPortalAccessModal }  from '../../../../features/candidates/components/GrantPortalAccessModal';

// Hooks
import {
  useCandidate,
  useDeleteCandidate,
  useUploadResume,
  useSendPreInterviewForm,
} from '../../../../features/candidates/hooks/useCandidates';
import { usePermission } from '../../../../features/auth/hooks/usePermission';

// Types
import {
  STATUS_COLORS, STATUS_LABEL, SOURCE_EMOJI,
  type CandidateStatus,
} from '../../../../features/candidates/types/candidate.types';
import { formatDate } from '../../../../utils/formatters';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12,
    }}>
      <span style={{ color: 'var(--ink4)', fontWeight: 500, minWidth: 150, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card cp">
      <div className="ct">{title}</div>
      {children}
    </div>
  );
}

function fmtSalary(monthly: number | null | undefined) {
  if (!monthly) return '—';
  return `₹${Number(monthly).toLocaleString('en-IN')}/mo (₹${(Number(monthly) * 12 / 100000).toFixed(2)}L/yr)`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CandidateDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const id       = parseInt(params.id as string, 10);
  const { isHR, isAdmin, isManager } = usePermission();
  const canManage = isHR || isAdmin || isManager;

  // Modal open states
  const [editOpen,          setEditOpen]          = useState(false);
  const [moveOpen,          setMoveOpen]           = useState(false);
  const [scheduleOpen,      setScheduleOpen]       = useState(false);
  const [resultOpen,        setResultOpen]         = useState(false);
  const [offerOpen,         setOfferOpen]          = useState(false);
  const [hireOpen,          setHireOpen]           = useState(false);
  const [withdrawOpen,      setWithdrawOpen]       = useState(false);
  const [preFormOpen,       setPreFormOpen]        = useState(false);
  const [portalOpen,        setPortalOpen]         = useState(false);
  const [aptitudeOpen,      setAptitudeOpen]       = useState(false);
  const [deleteOpen,        setDeleteOpen]         = useState(false);

  const { data: candidate, isLoading, isError } = useCandidate(id);
  const deleteMutation  = useDeleteCandidate();
  const resumeMutation  = useUploadResume(id);

  useEffect(() => {
    if (candidate) {
      dispatch(setPageTitle({ title: candidate.candidate_name, breadcrumb: 'ATS' }));
    }
  }, [candidate, dispatch]);

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    router.push('/ats');
  };

  if (isLoading) {
    return (
      <AppShell>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)', fontSize: 13 }}>
          Loading candidate…
        </div>
      </AppShell>
    );
  }

  if (isError || !candidate) {
    return (
      <AppShell>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>Candidate not found</div>
          <button className="btn btn-sec btn-sm" onClick={() => router.push('/ats')}>← Back</button>
        </div>
      </AppShell>
    );
  }

  const c           = candidate;
  const statusColor = STATUS_COLORS[c.status as CandidateStatus];

  // ─── Status-driven action buttons ────────────────────────────────────────
  const ActionBar = () => {
    if (!canManage) return null;
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Aptitude test — available at ANY stage */}
        <button className="btn btn-sec btn-sm" onClick={() => setAptitudeOpen(true)}>
          🧠 {c.aptitude_test_sent ? 'Resend Test' : 'Send Aptitude Test'}
        </button>

        {/* Schedule interview — when shortlisted */}
        {c.status === 'Shortlisted' && (
          <button className="btn btn-sec btn-sm" onClick={() => setScheduleOpen(true)}>📅 Schedule Interview</button>
        )}

        {/* Reschedule + pre-interview form — when scheduled */}
        {c.status === 'Interview_Scheduled' && (
          <>
            <button className="btn btn-sec btn-sm" onClick={() => setScheduleOpen(true)}>📅 Reschedule</button>
            {c.interview_accepted === true && (
              <button
                className="btn btn-sec btn-sm"
                style={c.pre_interview_form_sent ? { color: 'var(--green)', borderColor: 'var(--green-bd)' } : {}}
                onClick={() => setPreFormOpen(true)}
              >
                📋 {c.pre_interview_form_sent ? 'Resend Pre-Interview Form' : 'Send Pre-Interview Form'}
              </button>
            )}
          </>
        )}

        {/* Record result */}
        {c.status === 'Interview_Result' && (
          <button className="btn btn-pri btn-sm" style={{ background: 'var(--teal)', borderColor: 'var(--teal)' }} onClick={() => setResultOpen(true)}>
            🎯 Record Result
          </button>
        )}

        {/* Offer + Hire — when offered */}
        {c.status === 'Offered' && (
          <>
            <button className="btn btn-sec btn-sm" onClick={() => setOfferOpen(true)}>
              ✉ {c.offer_sent_at ? 'Resend Offer' : 'Send Offer Letter'}
            </button>
            <button className="btn btn-pri btn-sm" style={{ background: 'var(--green)', borderColor: 'var(--green)' }} onClick={() => setHireOpen(true)}>
              🎉 Confirm Hire
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <AppShell>
      <div className="pg-enter">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: 13, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--blue), var(--purple))',
              color: '#fff', fontWeight: 700, fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {c.candidate_name.trim().split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <h1 style={{ marginBottom: 6 }}>{c.candidate_name}</h1>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {statusColor && (
                  <span style={{
                    background: statusColor.bg, color: statusColor.text,
                    border: `1px solid ${statusColor.border}`,
                    borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                  }}>
                    {STATUS_LABEL[c.status as CandidateStatus] || c.status}
                  </span>
                )}
                {c.source        && <Chip variant="blue">{SOURCE_EMOJI[c.source] || ''} {c.source}</Chip>}
                {c.immediate_joiner && <Chip variant="green">⚡ Immediate</Chip>}
                {c.is_portal_user   && <Chip variant="teal">🌐 Portal</Chip>}
                {c.hired_at && c.converted_employee_id && (
                  <Chip variant="green" onClick={() => router.push(`/employees/${c.converted_employee_id}`)}>
                    👤 View Employee →
                  </Chip>
                )}
                {c.location && <span style={{ fontSize: 11, color: 'var(--ink4)' }}>📍 {c.location}</span>}
              </div>
            </div>
          </div>

          <div className="ph-r">
            <button className="btn btn-sec btn-sm" onClick={() => router.push('/ats')}>← Back</button>
            <ActionBar />
            {canManage && (
              <>
                <button className="btn btn-sec btn-sm" onClick={() => router.push(`/ats/${id}/forms`)}>
                  📋 View Forms
                </button>
                <button className="btn btn-sec btn-sm" onClick={() => setMoveOpen(true)}>Move Stage</button>
                <button className="btn btn-sec btn-sm" onClick={() => setEditOpen(true)}>Edit</button>
                {c.status !== 'Hired' && c.status !== 'Withdrawn' && (
                  <button className="btn btn-sec btn-sm" style={{ color: 'var(--amber)', borderColor: 'var(--amber-bd)' }} onClick={() => setWithdrawOpen(true)}>
                    Withdraw
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>Delete</button>
              </>
            )}
          </div>
        </div>

        {/* ── Reschedule alert ───────────────────────────────────────── */}
        {c.reschedule_requested && c.reschedule_status === 'Pending' && canManage && (
          <div style={{
            background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)',
            borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 12, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', marginBottom: 4 }}>
                🔄 Reschedule Request Pending
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                <strong>Reason:</strong> {c.reschedule_reason || '—'}
                {c.reschedule_proposed_date && (
                  <span style={{ marginLeft: 12 }}>
                    <strong>Proposed:</strong> {formatDate(c.reschedule_proposed_date)} {c.reschedule_proposed_time || ''}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sec btn-sm" onClick={() => setScheduleOpen(true)}>
                ✓ Approve &amp; Reschedule
              </button>
            </div>
          </div>
        )}

        <div className="g2">
          {/* ── LEFT column ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Interview card ───────────────────────────────────── */}
            {c.interview_date && (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--purple-bd)',
                borderRadius: 'var(--r3)', padding: '18px 20px', boxShadow: 'var(--sh)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  📅 Interview Scheduled
                  {canManage && (
                    <button className="btn btn-sec btn-sm" onClick={() => setScheduleOpen(true)}>
                      Reschedule
                    </button>
                  )}
                </div>
                <InfoRow label="Date"       value={formatDate(c.interview_date)} />
                <InfoRow label="Time"       value={c.interview_time || '—'} />
                <InfoRow label="Format"     value={c.interview_type || '—'} />
                <InfoRow label="Response"   value={
                  c.interview_accepted === null  ? <Chip variant="amber">Awaiting</Chip> :
                  c.interview_accepted           ? <Chip variant="green">Accepted ✓</Chip> :
                                                   <Chip variant="red">Declined ✗</Chip>
                } />
                {c.interview_link && (
                  <div style={{ marginTop: 8 }}>
                    <a href={c.interview_link} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
                      🔗 Join Interview →
                    </a>
                  </div>
                )}
                {c.interview_instructions && (
                  <div style={{ marginTop: 10, background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 11, color: 'var(--blue)' }}>
                    {c.interview_instructions}
                  </div>
                )}
                {/* Pre-interview form send button after acceptance */}
                {c.interview_accepted === true && canManage && (
                  <button
                    className="btn btn-sec btn-sm"
                    style={{ marginTop: 12, width: '100%' }}
                    onClick={() => setPreFormOpen(true)}
                  >
                    📋 Send Pre-Interview Form
                  </button>
                )}
              </div>
            )}

            {/* ── Interview Result card ────────────────────────────── */}
            {c.candidate_decision && (
              <div style={{
                background: 'var(--surface)',
                border: `1px solid ${c.candidate_decision === 'Select' ? 'var(--green-bd)' : c.candidate_decision === 'Reject' ? 'var(--red-bd)' : 'var(--amber-bd)'}`,
                borderRadius: 'var(--r3)', padding: '18px 20px', boxShadow: 'var(--sh)',
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, marginBottom: 12,
                  color: c.candidate_decision === 'Select' ? 'var(--green)' : c.candidate_decision === 'Reject' ? 'var(--red)' : 'var(--amber)',
                }}>
                  {c.candidate_decision === 'Select' ? '✓ Selected' : c.candidate_decision === 'Reject' ? '✗ Rejected' : '⏸ On Hold'} — Interview Result
                </div>
                {c.interview_result_date && <InfoRow label="Interview date" value={new Date(c.interview_result_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} />}
                {c.interview_result_mode  && <InfoRow label="Mode"          value={c.interview_result_mode} />}
                {c.decision_joining_date  && <InfoRow label="Joining date"  value={formatDate(c.decision_joining_date)} />}
                {c.decision_reason && (
                  <div style={{ marginTop: 10, background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 12, color: 'var(--ink)', lineHeight: 1.6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', display: 'block', marginBottom: 3 }}>REASON</span>
                    {c.decision_reason}
                  </div>
                )}
                {c.interview_result_feedback && (
                  <div style={{ marginTop: 10, background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 12, color: 'var(--ink)', lineHeight: 1.6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink4)', display: 'block', marginBottom: 3 }}>FEEDBACK</span>
                    {c.interview_result_feedback}
                  </div>
                )}
              </div>
            )}

            {/* ── Offer card ───────────────────────────────────────── */}
            {(c.status === 'Offered' || c.status === 'Hired') && (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--green-bd)',
                borderRadius: 'var(--r3)', padding: '18px 20px', boxShadow: 'var(--sh)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  ✉ Offer Details
                  {c.status === 'Offered' && canManage && (
                    <button className="btn btn-sec btn-sm" onClick={() => setOfferOpen(true)}>
                      {c.offer_sent_at ? 'Resend Offer' : 'Send Offer'}
                    </button>
                  )}
                </div>
                {c.offered_ctc && <InfoRow label="Offered CTC (mo)"    value={fmtSalary(c.offered_ctc)} />}
                {c.confirmed_joining_date && <InfoRow label="Joining date"  value={formatDate(c.confirmed_joining_date)} />}
                {c.offer_valid_till        && <InfoRow label="Offer valid till" value={new Date(c.offer_valid_till).toLocaleDateString('en-IN', { dateStyle: 'medium' })} />}
                {c.offer_sent_at && <InfoRow label="Offer sent"        value={new Date(c.offer_sent_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} />}
                {c.offer_letter_url && (
                  <div style={{ marginTop: 8 }}>
                    <a href={c.offer_letter_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
                      📄 View Offer Letter →
                    </a>
                  </div>
                )}
                {c.status === 'Offered' && !c.offer_sent_at && canManage && (
                  <button className="btn btn-pri btn-sm" style={{ marginTop: 12, width: '100%', background: 'var(--green)', borderColor: 'var(--green)' }} onClick={() => setOfferOpen(true)}>
                    ✉ Send Offer Letter
                  </button>
                )}
                {c.status === 'Offered' && canManage && (
                  <button className="btn btn-pri btn-sm" style={{ marginTop: 8, width: '100%' }} onClick={() => setHireOpen(true)}>
                    🎉 Confirm Hire
                  </button>
                )}
              </div>
            )}

            {/* ── Hired card ───────────────────────────────────────── */}
            {c.status === 'Hired' && c.hired_at && (
              <div style={{ background: 'var(--green-lt)', border: '1px solid var(--green-bd)', borderRadius: 'var(--r3)', padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 10 }}>
                  🎉 Hired on {new Date(c.hired_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </div>
                {c.converted_employee_id && (
                  <button
                    className="btn btn-sec btn-sm"
                    onClick={() => router.push(`/employees/${c.converted_employee_id}`)}
                  >
                    👤 View Employee Record →
                  </button>
                )}
              </div>
            )}

            {/* ── Withdrawal card ──────────────────────────────────── */}
            {c.status === 'Withdrawn' && (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink4)', marginBottom: 8 }}>
                  ✗ Withdrawn {c.withdrawn_at ? `on ${new Date(c.withdrawn_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}` : ''}
                </div>
                {c.withdrawal_reason && (
                  <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.6, background: 'var(--surface)', borderRadius: 'var(--r)', padding: '8px 12px' }}>
                    {c.withdrawal_reason}
                  </div>
                )}
                {canManage && (
                  <button className="btn btn-sec btn-sm" style={{ marginTop: 10 }} onClick={() => setMoveOpen(true)}>
                    ↩ Re-activate
                  </button>
                )}
              </div>
            )}

            {/* ── Personal ─────────────────────────────────────────── */}
            <SectionCard title="Personal Details">
              <InfoRow label="Email"        value={c.email ? <a href={`mailto:${c.email}`} style={{ color: 'var(--blue)' }}>{c.email}</a> : null} />
              <InfoRow label="Phone"        value={c.phone_number ? <a href={`tel:${c.phone_number}`} style={{ color: 'var(--blue)' }}>{c.phone_number}</a> : null} />
              <InfoRow label="Gender"       value={c.gender} />
              <InfoRow label="Date of Birth" value={formatDate(c.date_of_birth)} />
              <InfoRow label="Location"     value={c.location} />
              <InfoRow label="Qualification" value={c.qualification} />
              <InfoRow label="Own Vehicle"  value={c.own_vehicle ? '✓ Yes' : '✗ No'} />
            </SectionCard>

            {/* ── Experience ───────────────────────────────────────── */}
            <SectionCard title="Experience">
              <InfoRow label="Current Company"  value={c.current_company_name} />
              <InfoRow label="Last Designation" value={c.current_company_designation} />
              <InfoRow label="Total Experience" value={c.total_experience != null ? `${c.total_experience} years` : null} />
              <InfoRow label="Relevant Exp."   value={c.relevant_experience != null ? `${c.relevant_experience} years` : null} />
            </SectionCard>

            {/* ── Sourcing ─────────────────────────────────────────── */}
            <SectionCard title="Sourcing">
              <InfoRow label="Source"    value={c.source ? `${SOURCE_EMOJI[c.source] || ''} ${c.source}` : null} />
              <InfoRow label="Reference" value={c.reference_source} />
              {c.remarks && (
                <div style={{ marginTop: 8, background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 12, color: 'var(--ink)', lineHeight: 1.6 }}>
                  {c.remarks}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── RIGHT column ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Compensation ─────────────────────────────────────── */}
            <SectionCard title="Compensation">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 4 }}>Current (monthly)</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
                    {c.current_salary ? `₹${Number(c.current_salary).toLocaleString('en-IN')}` : '—'}
                  </div>
                  {c.current_salary && <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>₹{(Number(c.current_salary) * 12 / 100000).toFixed(2)}L/yr</div>}
                </div>
                <div style={{ background: 'var(--green-lt)', border: '1px solid var(--green-bd)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 4 }}>Expected (monthly)</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--green)' }}>
                    {c.expected_salary ? `₹${Number(c.expected_salary).toLocaleString('en-IN')}` : '—'}
                  </div>
                  {c.expected_salary && <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>₹{(Number(c.expected_salary) * 12 / 100000).toFixed(2)}L/yr</div>}
                </div>
              </div>
              {c.current_salary && c.expected_salary && (() => {
                const cur = Number(c.current_salary); const exp = Number(c.expected_salary);
                const hike = (((exp - cur) / cur) * 100).toFixed(1);
                return (
                  <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink4)' }}>Hike expectation</span>
                    <strong style={{ fontFamily: 'var(--mono)', color: exp > cur ? 'var(--green)' : 'var(--red)' }}>
                      {Number(hike) >= 0 ? '+' : ''}{hike}%
                    </strong>
                  </div>
                );
              })()}
            </SectionCard>

            {/* ── Availability ─────────────────────────────────────── */}
            <SectionCard title="Availability">
              <InfoRow label="Notice Period"    value={c.notice_period != null ? `${c.notice_period} days` : null} />
              <InfoRow label="Expected Joining" value={formatDate(c.expected_joining_date)} />
              <InfoRow label="Immediate Joiner" value={
                <span style={{ color: c.immediate_joiner ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                  {c.immediate_joiner ? '⚡ Yes' : '✗ No'}
                </span>
              } />
            </SectionCard>

            {/* ── Aptitude ─────────────────────────────────────────── */}
            <SectionCard title="Aptitude Test">
              {c.aptitude_attempted_at ? (
                <>
                  <InfoRow label="Attempted" value={formatDate(c.aptitude_attempted_at)} />
                  <InfoRow label="Score (HR only)" value={
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--blue)' }}>
                      {c.aptitude_score ?? '—'}
                    </span>
                  } />
                  {c.aptitude_time_taken && (
                    <InfoRow label="Time taken" value={`${Math.floor(c.aptitude_time_taken / 60)}m ${c.aptitude_time_taken % 60}s`} />
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--ink4)', fontSize: 12 }}>
                  No aptitude test taken yet
                </div>
              )}
            </SectionCard>

            {/* ── Resume ───────────────────────────────────────────── */}
            <SectionCard title="Resume">
              {c.resume_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 28 }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Resume on file</div>
                    <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${c.resume_url}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: 'var(--blue)' }}>
                      View / Download →
                    </a>
                  </div>
                  {canManage && (
                    <label style={{ cursor: 'pointer' }}>
                      <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) resumeMutation.mutate(f); }} />
                      <span className="btn btn-sec btn-sm">Replace</span>
                    </label>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 10 }}>No resume uploaded</div>
                  {canManage && (
                    <label style={{ cursor: 'pointer' }}>
                      <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) resumeMutation.mutate(f); }} />
                      <span className="btn btn-sec btn-sm">
                        {resumeMutation.isPending ? 'Uploading…' : '↑ Upload Resume'}
                      </span>
                    </label>
                  )}
                </div>
              )}
            </SectionCard>

            {/* ── Portal ───────────────────────────────────────────── */}
            <SectionCard title="Candidate Portal">
              <InfoRow label="Portal access"  value={<Chip variant={c.is_portal_user ? 'green' : 'gray'}>{c.is_portal_user ? '✓ Active' : 'Not granted'}</Chip>} />
              {c.portal_last_login && <InfoRow label="Last login" value={formatDate(c.portal_last_login)} />}
              <InfoRow label="Pre-interview form" value={
                <Chip variant={c.preinterview_form_status === 'Submitted' ? 'green' : c.preinterview_form_status === 'Draft' ? 'amber' : 'gray'}>
                  {c.preinterview_form_status === 'Submitted' ? '✓ Submitted' : c.preinterview_form_status === 'Draft' ? '📝 Draft' : 'Not started'}
                </Chip>
              } />
              <InfoRow label="Pre-interview sent" value={
                c.pre_interview_form_sent
                  ? <Chip variant="green">✓ Sent {c.pre_interview_form_sent_at ? formatDate(c.pre_interview_form_sent_at) : ''}</Chip>
                  : <Chip variant="gray">Not sent</Chip>
              } />
              <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                {canManage && (
                  <button className="btn btn-sec btn-sm" onClick={() => setPortalOpen(true)} style={{ flex:1 }}>
                    {c.is_portal_user ? '🔑 Reset Portal Password' : '🌐 Grant Portal Access'}
                  </button>
                )}
              </div>
              <InfoRow label="Aptitude test sent" value={
                c.aptitude_test_sent
                  ? <Chip variant="green">✓ Sent {c.aptitude_test_sent_at ? formatDate(c.aptitude_test_sent_at) : ''}</Chip>
                  : <Chip variant="gray">Not sent</Chip>
              } />

              <InfoRow label="Pre-joining form" value={
                c.pre_joining_form_sent
                  ? <Chip variant="green">✓ Unlocked</Chip>
                  : <Chip variant="gray">Not unlocked</Chip>
              } />
            </SectionCard>

            {/* ── Record ───────────────────────────────────────────── */}
            <SectionCard title="Record">
              <InfoRow label="Added"   value={formatDate(c.created_at)} />
              <InfoRow label="Updated" value={formatDate(c.updated_at)} />
            </SectionCard>
          </div>
        </div>
      </div>

      {/* ── All Modals ───────────────────────────────────────────────────── */}

      <CandidateFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        candidate={c}
      />

      <StatusMoveModal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        candidate={c}
        onInterviewResult={() => { setMoveOpen(false); setResultOpen(true); }}
      />

      <InterviewSchedulerModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        candidate={c}
      />

      <InterviewResultModal
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        candidate={c}
      />

      <AptitudeTestSendModal
        open={aptitudeOpen}
        onClose={() => setAptitudeOpen(false)}
        candidate={c}
      />

      <GrantPortalAccessModal
        open={portalOpen}
        onClose={() => setPortalOpen(false)}
        candidate={c}
      />      

      <PreInterviewFormModal
        open={preFormOpen}
        onClose={() => setPreFormOpen(false)}
        candidate={c}
      />

      <OfferLetterModal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        candidate={c}
      />

      <HireCandidateModal
        open={hireOpen}
        onClose={() => setHireOpen(false)}
        candidate={c}
      />

      <WithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        candidate={c}
      />

      {/* Delete confirmation */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Candidate"
        subtitle={`Remove ${c.candidate_name}?`}
        footer={
          <>
            <button className="btn btn-sec" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Removing…' : 'Yes, Remove'}
            </button>
          </>
        }
      >
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)' }}>
          ⚠ Soft delete — the candidate record is preserved in audit logs.
        </div>
      </Modal>
    </AppShell>
  );
}
