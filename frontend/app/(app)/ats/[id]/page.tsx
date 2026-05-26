'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch }       from '../../../../store';
import { setPageTitle }         from '../../../../store/slices/uiSlice';
import { AppShell }             from '../../../../layouts/AppLayout';
import { Chip }                 from '../../../../components/ui/Chip';
import { Modal }                from '../../../../components/ui/Modal';
import { CandidateFormModal }   from '../../../../features/candidates/components/CandidateFormModal';
import { StatusMoveModal }      from '../../../../features/candidates/components/StatusMoveModal';
import { InterviewSchedulerModal } from '../../../../features/candidates/components/InterviewSchedulerModal';
import { useCandidate, useDeleteCandidate, useUploadResume } from '../../../../features/candidates/hooks/useCandidates';
import { candidateService }     from '../../../../services/api/candidate.service';
import { usePermission }        from '../../../../features/auth/hooks/usePermission';
import { STATUS_COLORS, STATUS_LABEL, SOURCE_EMOJI, type CandidateStatus } from '../../../../features/candidates/types/candidate.types';
import { showToast }            from '../../../../utils/toast';
import { formatDate }           from '../../../../utils/formatters';
import useCandidatePassword from '@/hooks/useCandidatePassword';

export default function CandidateDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const qc       = useQueryClient();
  const id       = parseInt(params.id as string, 10);
  const { isHR, isAdmin, isManager } = usePermission();
  const canManage = isHR || isAdmin || isManager;

  const [editOpen,      setEditOpen]      = useState(false);
  const [moveOpen,      setMoveOpen]      = useState(false);
  const [scheduleOpen,  setScheduleOpen]  = useState(false);
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [reschedOpen,   setReschedOpen]   = useState(false);

  const { data: candidate, isLoading, isError } = useCandidate(id);
  const deleteMutation = useDeleteCandidate();
  const resumeMutation = useUploadResume(id);

  const grantPortalMutation = useMutation({
    mutationFn: ({password} : {password: string}) => candidateService.grantPortalAccess(id, password),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['candidates', id] }); showToast('✓ Portal access granted'); },
    onError: (err: any) => showToast(err?.message || 'Failed'),
  });

  const reschedDecisionMutation = useMutation({
    mutationFn: ({ decision, date, time }: { decision: 'Approved' | 'Rejected'; date?: string; time?: string }) =>
      candidateService.handleReschedule(id, decision, date, time),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['candidates', id] });
      showToast(`Reschedule ${vars.decision.toLowerCase()}`);
      setReschedOpen(false);
    },
    onError: (err: any) => showToast(err?.message || 'Failed'),
  });

  useEffect(() => {
    if (candidate) dispatch(setPageTitle({ title: candidate.candidate_name, breadcrumb: 'ATS' }));
  }, [candidate, dispatch]);

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    router.push('/ats');
  };

  if (isLoading) return <AppShell><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)', fontSize: 13, fontFamily: 'var(--font)' }}>Loading candidate…</div></AppShell>;
  if (isError || !candidate) return <AppShell><div style={{ textAlign: 'center', padding: '60px 0' }}><div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>Candidate not found</div><button className="btn btn-sec btn-sm" onClick={() => router.push('/ats')}>← Back</button></div></AppShell>;

  const c = candidate;
  const statusColor = STATUS_COLORS[c.status as CandidateStatus];
  const hasInterview = !!c.interview_date;
  const hasPendingReschedule = c.reschedule_requested && c.reschedule_status === 'Pending';

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
      <span style={{ color: 'var(--ink4)', fontWeight: 500, minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  );

  return (
    <AppShell>
      <div className="pg-enter">

        {/* Header */}
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 13, background: 'linear-gradient(135deg, var(--blue), var(--purple))', color: '#fff', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {c.candidate_name.trim().split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase()}
            </div>
            <div>
              <h1 style={{ marginBottom: 6 }}>{c.candidate_name}</h1>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {statusColor && <span style={{ background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}`, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{STATUS_LABEL[c.status as CandidateStatus] || c.status}</span>}
                {c.source && <Chip variant="blue">{SOURCE_EMOJI[c.source] || ''} {c.source}</Chip>}
                {c.immediate_joiner && <Chip variant="green">⚡ Immediate</Chip>}
                {c.is_portal_user && <Chip variant="teal">🌐 Portal</Chip>}
                {c.location && <span style={{ fontSize: 11, color: 'var(--ink4)' }}>📍 {c.location}</span>}
              </div>
            </div>
          </div>

          <div className="ph-r">
            <button className="btn btn-sec btn-sm" onClick={() => router.push('/ats')}>← Back</button>
            {canManage && (<>
              <button className="btn btn-sec btn-sm" onClick={() => setMoveOpen(true)}>Move Stage</button>
              <button className="btn btn-sec btn-sm" onClick={() => setScheduleOpen(true)}>📅 Schedule Interview</button>
              <button className="btn btn-sec btn-sm" onClick={() => setEditOpen(true)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>Delete</button>
            </>)}
          </div>
        </div>

        {/* Reschedule alert */}
        {hasPendingReschedule && canManage && (
          <div style={{ background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', marginBottom: 4 }}>🔄 Reschedule Requested</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                <strong>Reason:</strong> {c.reschedule_reason || '—'}
                {c.reschedule_proposed_date && <span style={{ marginLeft: 12 }}><strong>Proposed:</strong> {formatDate(c.reschedule_proposed_date)} {c.reschedule_proposed_time || ''}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-pri btn-sm" style={{ background: 'var(--green)' }} onClick={() => reschedDecisionMutation.mutate({ decision: 'Approved', date: c.reschedule_proposed_date || undefined, time: c.reschedule_proposed_time || undefined })} disabled={reschedDecisionMutation.isPending}>✓ Approve</button>
              <button className="btn btn-sec btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red-bd)' }} onClick={() => reschedDecisionMutation.mutate({ decision: 'Rejected' })} disabled={reschedDecisionMutation.isPending}>✗ Reject</button>
            </div>
          </div>
        )}

        <div className="g2">
          {/* LEFT column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Interview card */}
            {hasInterview && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--purple-bd)', borderRadius: 'var(--r3)', padding: '18px 20px', boxShadow: 'var(--sh)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  📅 Interview Details
                  {canManage && <button className="btn btn-sec btn-sm" onClick={() => setScheduleOpen(true)}>Reschedule</button>}
                </div>
                <InfoRow label="Date"          value={formatDate(c.interview_date)} />
                <InfoRow label="Time"          value={c.interview_time || '—'} />
                <InfoRow label="Type"          value={c.interview_type || '—'} />
                <InfoRow label="Candidate response" value={
                  c.interview_accepted === null ? <Chip variant="amber">Awaiting</Chip> :
                  c.interview_accepted ? <Chip variant="green">Accepted ✓</Chip> :
                  <Chip variant="red">Declined ✗</Chip>
                } />
                {c.interview_link && <div style={{ marginTop: 8 }}><a href={c.interview_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', fontSize: 12, fontWeight: 600 }}>🔗 Join Interview →</a></div>}
                {c.interview_instructions && <div style={{ marginTop: 10, background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 11, color: 'var(--blue)' }}>{c.interview_instructions}</div>}
              </div>
            )}

            {/* Personal */}
            <div className="card cp">
              <div className="ct">Personal Details</div>
              <InfoRow label="Email"       value={c.email ? <a href={`mailto:${c.email}`} style={{ color: 'var(--blue)' }}>{c.email}</a> : null} />
              <InfoRow label="Phone"       value={c.phone_number ? <a href={`tel:${c.phone_number}`} style={{ color: 'var(--blue)' }}>{c.phone_number}</a> : null} />
              <InfoRow label="Gender"      value={c.gender} />
              <InfoRow label="DOB"         value={formatDate(c.date_of_birth)} />
              <InfoRow label="Location"    value={c.location} />
              <InfoRow label="Qualification" value={c.qualification} />
              <InfoRow label="Own Vehicle" value={c.own_vehicle ? '✓ Yes' : '✗ No'} />
            </div>

            {/* Experience */}
            <div className="card cp">
              <div className="ct">Experience</div>
              <InfoRow label="Current Company"  value={c.current_company_name} />
              <InfoRow label="Last Designation" value={c.last_company_designation} />
              <InfoRow label="Total Experience" value={c.total_experience != null ? `${c.total_experience} years` : null} />
              <InfoRow label="Relevant Exp."    value={c.relevant_experience != null ? `${c.relevant_experience} years` : null} />
              {c.skills && c.skills.length > 0 && (
                <div style={{ paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {c.skills.map((s: string) => (
                      <span key={s} style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', color: 'var(--blue)', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sourcing */}
            <div className="card cp">
              <div className="ct">Sourcing & Remarks</div>
              <InfoRow label="Source"    value={c.source ? `${SOURCE_EMOJI[c.source] || ''} ${c.source}` : null} />
              <InfoRow label="Reference" value={c.reference_source} />
              {c.remarks && <div style={{ marginTop: 10, background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '10px 12px', fontSize: 12, color: 'var(--ink)', lineHeight: 1.6 }}>{c.remarks}</div>}
            </div>
          </div>

          {/* RIGHT column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Compensation */}
            <div className="card cp">
              <div className="ct">Compensation</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 4 }}>Current (monthly)</div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)' }}>{c.current_salary ? `₹${c.current_salary.toLocaleString('en-IN')}` : '—'}</div>
                  {c.current_salary && <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>₹{((c.current_salary * 12) / 100000).toFixed(2)}L/yr</div>}
                </div>
                <div style={{ background: 'var(--green-lt)', border: '1px solid var(--green-bd)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 4 }}>Expected (monthly)</div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--green)' }}>{c.expected_salary ? `₹${c.expected_salary.toLocaleString('en-IN')}` : '—'}</div>
                  {c.expected_salary && <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>₹{((c.expected_salary * 12) / 100000).toFixed(2)}L/yr</div>}
                </div>
              </div>
              {c.current_salary && c.expected_salary && (
                <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--ink4)' }}>Hike expectation</span>
                  <strong style={{ fontFamily: 'var(--mono)', color: c.expected_salary > c.current_salary ? 'var(--green)' : 'var(--red)' }}>
                    {(((c.expected_salary - c.current_salary) / c.current_salary) * 100).toFixed(1)}%
                  </strong>
                </div>
              )}
            </div>

            {/* Availability */}
            <div className="card cp">
              <div className="ct">Availability</div>
              <InfoRow label="Notice Period"   value={c.notice_period != null ? `${c.notice_period} days` : null} />
              <InfoRow label="Expected Joining" value={formatDate(c.expected_joining_date)} />
              <InfoRow label="Immediate Joiner" value={<span style={{ color: c.immediate_joiner ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{c.immediate_joiner ? '⚡ Yes' : '✗ No'}</span>} />
            </div>

            {/* Aptitude */}
            <div className="card cp">
              <div className="ct">Aptitude Test</div>
              {c.aptitude_attempted_at ? (
                <>
                  <InfoRow label="Attempted" value={formatDate(c.aptitude_attempted_at)} />
                  <InfoRow label="Score (HR only)" value={<span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: 'var(--blue)' }}>{c.aptitude_score ?? '—'}</span>} />
                  {c.aptitude_time_taken && <InfoRow label="Time taken" value={`${Math.floor(c.aptitude_time_taken / 60)}m ${c.aptitude_time_taken % 60}s`} />}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--ink4)', fontSize: 12 }}>No test taken yet</div>
              )}
            </div>

            {/* Resume */}
            <div className="card cp">
              <div className="ct">Resume</div>
              {c.resume_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 28 }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Resume on file</div>
                    <a href={`http://localhost:5000${c.resume_url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--blue)' }}>View / Download →</a>
                  </div>
                  {canManage && (
                    <label style={{ cursor: 'pointer' }}>
                      <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) resumeMutation.mutate(f); }} />
                      <span className="btn btn-sec btn-sm">Replace</span>
                    </label>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 10 }}>No resume uploaded</div>
                  {canManage && (
                    <label style={{ cursor: 'pointer' }}>
                      <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) resumeMutation.mutate(f); }} />
                      <span className="btn btn-sec btn-sm">{resumeMutation.isPending ? 'Uploading…' : '↑ Upload Resume'}</span>
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Portal */}
            <div className="card cp">
              <div className="ct">Candidate Portal</div>
              <InfoRow label="Portal access" value={<Chip variant={c.is_portal_user ? 'green' : 'gray'}>{c.is_portal_user ? '✓ Active' : 'Not granted'}</Chip>} />
              {c.portal_last_login && <InfoRow label="Last login" value={formatDate(c.portal_last_login)} />}
              {canManage && !c.is_portal_user && (
                <button className="btn btn-sec btn-sm" style={{ marginTop: 10 }} onClick={() => grantPortalMutation.mutate({password: useCandidatePassword(c.candidate_name, c.id)})} disabled={grantPortalMutation.isPending}>
                  {grantPortalMutation.isPending ? 'Granting…' : '🌐 Grant Portal Access'}
                </button>
              )}
              {canManage && c.is_portal_user && (
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink4)' }}>
                  Share portal link: <a href="/portal/login" target="_blank" style={{ color: 'var(--blue)' }}>/portal/login</a>
                </div>
              )}
              {/* Pre-join status */}
              <InfoRow label="Pre-join form" value={<Chip variant={c.prejoin_form_status === 'Submitted' ? 'green' : c.prejoin_form_status === 'Draft' ? 'amber' : 'gray'}>{c.prejoin_form_status === 'Submitted' ? '✓ Submitted' : c.prejoin_form_status === 'Draft' ? 'Draft saved' : 'Not started'}</Chip>} />
            </div>

            {/* Meta */}
            <div className="card cp">
              <div className="ct">Record</div>
              <InfoRow label="Added"   value={formatDate(c.created_at)} />
              <InfoRow label="Updated" value={formatDate(c.updated_at)} />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CandidateFormModal open={editOpen} onClose={() => setEditOpen(false)} candidate={c} />
      <StatusMoveModal open={moveOpen} onClose={() => setMoveOpen(false)} candidate={c} />
      <InterviewSchedulerModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} candidate={c} />

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Candidate" subtitle={`Remove ${c.candidate_name}?`}
        footer={<><button className="btn btn-sec" onClick={() => setDeleteOpen(false)}>Cancel</button><button className="btn btn-danger" onClick={handleDelete} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? 'Removing…' : 'Yes, Remove'}</button></>}>
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)' }}>⚠ Soft delete — record preserved in audit logs.</div>
      </Modal>
    </AppShell>
  );
}
