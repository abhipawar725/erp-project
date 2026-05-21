'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch }       from '../../../../store';
import { setPageTitle }         from '../../../../store/slices/uiSlice';
import { AppShell }             from '../../../../layouts/AppLayout';
import { Chip }                 from '../../../../components/ui/Chip';
import { Modal }                from '../../../../components/ui/Modal';
import { CandidateFormModal }   from '../../../../features/candidates/components/CandidateFormModal';
import { StatusMoveModal }      from '../../../../features/candidates/components/StatusMoveModal';
import { useCandidate, useDeleteCandidate, useUploadResume } from '../../../../features/candidates/hooks/useCandidates';
import { usePermission }        from '../../../../features/auth/hooks/usePermission';
import { STATUS_COLORS, SOURCE_EMOJI, type CandidateStatus } from '../../../../features/candidates/types/candidate.types';
import { formatDate }           from '../../../../utils/formatters';

// Salary formatter
const fmtSalary = (monthly: number | null | undefined) => {
  if (!monthly) return '—';
  const annual = monthly * 12;
  return annual >= 100000
    ? `₹${(annual / 100000).toFixed(2)}L/yr (₹${monthly.toLocaleString('en-IN')}/mo)`
    : `₹${monthly.toLocaleString('en-IN')}/mo`;
};

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
    <span style={{ color: 'var(--ink4)', fontWeight: 500, minWidth: 130 }}>{label}</span>
    <span style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>{value || '—'}</span>
  </div>
);

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const id = parseInt(params.id as string, 10);
  const { isHR, isAdmin, isManager } = usePermission();
  const canManage = isHR || isAdmin || isManager;

  const [editOpen,   setEditOpen]   = useState(false);
  const [moveOpen,   setMoveOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: candidate, isLoading, isError } = useCandidate(id);
  const deleteMutation = useDeleteCandidate();
  const resumeMutation = useUploadResume(id);

  useEffect(() => {
    if (candidate) dispatch(setPageTitle({ title: candidate.candidate_name, breadcrumb: 'ATS' }));
  }, [candidate, dispatch]);

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    router.push('/ats');
  };

  if (isLoading) {
    return <AppShell><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)', fontSize: 13 }}>Loading candidate…</div></AppShell>;
  }

  if (isError || !candidate) {
    return (
      <AppShell>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>Candidate not found</div>
          <button className="btn btn-sec btn-sm" onClick={() => router.push('/ats')}>← Back to ATS</button>
        </div>
      </AppShell>
    );
  }

  const statusColor = STATUS_COLORS[candidate.status as CandidateStatus];

  return (
    <AppShell>
      <div className="pg-enter">

        {/* Header */}
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: 13, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--blue), var(--purple))',
              color: '#fff', fontWeight: 700, fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {candidate.candidate_name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <h1 style={{ marginBottom: 6 }}>{candidate.candidate_name}</h1>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Status pill */}
                {statusColor && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}`, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                    {candidate.status}
                  </span>
                )}
                {candidate.source && (
                  <Chip variant="blue">{SOURCE_EMOJI[candidate.source] || ''} {candidate.source}</Chip>
                )}
                {candidate.immediate_joiner && (
                  <Chip variant="green">⚡ Immediate Joiner</Chip>
                )}
                {candidate.location && (
                  <span style={{ fontSize: 11, color: 'var(--ink4)' }}>📍 {candidate.location}</span>
                )}
              </div>
            </div>
          </div>

          <div className="ph-r">
            <button className="btn btn-sec btn-sm" onClick={() => router.push('/ats')}>← Back</button>
            {canManage && (
              <>
                <button className="btn btn-sec btn-sm" onClick={() => setMoveOpen(true)}>Move Stage</button>
                <button className="btn btn-sec btn-sm" onClick={() => setEditOpen(true)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>Delete</button>
              </>
            )}
          </div>
        </div>

        <div className="g2">
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Personal */}
            <div className="card cp">
              <div className="ct">Personal Details</div>
              <InfoRow label="Email"      value={candidate.email ? <a href={`mailto:${candidate.email}`} style={{ color: 'var(--blue)' }}>{candidate.email}</a> : null} />
              <InfoRow label="Phone"      value={candidate.phone_number ? <a href={`tel:${candidate.phone_number}`} style={{ color: 'var(--blue)' }}>{candidate.phone_number}</a> : null} />
              <InfoRow label="Gender"     value={candidate.gender} />
              <InfoRow label="DOB"        value={formatDate(candidate.date_of_birth)} />
              <InfoRow label="Location"   value={candidate.location} />
              <InfoRow label="Qualification" value={candidate.qualification} />
              <InfoRow label="Own Vehicle" value={candidate.own_vehicle ? '✓ Yes' : '✗ No'} />
            </div>

            {/* Experience */}
            <div className="card cp">
              <div className="ct">Experience</div>
              <InfoRow label="Current Company"  value={candidate.current_company_name} />
              <InfoRow label="Last Designation" value={candidate.last_company_designation} />
              <InfoRow label="Total Experience" value={candidate.total_experience != null ? `${candidate.total_experience} years` : null} />
              <InfoRow label="Relevant Exp."   value={candidate.relevant_experience != null ? `${candidate.relevant_experience} years` : null} />
              {candidate.skills && candidate.skills.length > 0 && (
                <div style={{ paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 500, marginBottom: 8 }}>Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {candidate.skills.map((skill) => (
                      <span key={skill} style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', color: 'var(--blue)', borderRadius: 99, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sourcing */}
            <div className="card cp">
              <div className="ct">Sourcing</div>
              <InfoRow label="Source"     value={candidate.source ? `${SOURCE_EMOJI[candidate.source] || ''} ${candidate.source}` : null} />
              <InfoRow label="Reference"  value={candidate.reference_source} />
              {candidate.remarks && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 500, marginBottom: 6 }}>Remarks</div>
                  <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.6, background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '10px 12px' }}>
                    {candidate.remarks}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Compensation card */}
            <div className="card cp">
              <div className="ct">Compensation</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 4 }}>Current Salary</div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
                    {candidate.current_salary ? `₹${candidate.current_salary.toLocaleString('en-IN')}` : '—'}
                  </div>
                  {candidate.current_salary && (
                    <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 3 }}>
                      ₹{((candidate.current_salary * 12) / 100000).toFixed(2)}L / year
                    </div>
                  )}
                </div>
                <div style={{ background: 'var(--green-lt)', border: '1px solid var(--green-bd)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 4 }}>Expected Salary</div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--green)' }}>
                    {candidate.expected_salary ? `₹${candidate.expected_salary.toLocaleString('en-IN')}` : '—'}
                  </div>
                  {candidate.expected_salary && (
                    <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 3 }}>
                      ₹{((candidate.expected_salary * 12) / 100000).toFixed(2)}L / year
                    </div>
                  )}
                </div>
              </div>

              {/* Hike indicator */}
              {candidate.current_salary && candidate.expected_salary && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12,
                }}>
                  <span style={{ color: 'var(--ink4)', fontWeight: 500 }}>Hike expectation</span>
                  <span style={{
                    fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14,
                    color: candidate.expected_salary > candidate.current_salary ? 'var(--green)' : 'var(--red)',
                  }}>
                    {(((candidate.expected_salary - candidate.current_salary) / candidate.current_salary) * 100).toFixed(1)}%
                    {candidate.expected_salary > candidate.current_salary ? ' ↑' : ' ↓'}
                  </span>
                </div>
              )}
            </div>

            {/* Availability */}
            <div className="card cp">
              <div className="ct">Availability</div>
              <InfoRow label="Notice Period" value={
                candidate.notice_period != null
                  ? `${candidate.notice_period} ${candidate.notice_period_unit || 'Days'}`
                  : null
              } />
              <InfoRow label="Expected Joining" value={formatDate(candidate.expected_joining_date)} />
              <InfoRow label="Immediate Joiner" value={
                <span style={{ color: candidate.immediate_joiner ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                  {candidate.immediate_joiner ? '⚡ Yes' : '✗ No'}
                </span>
              } />
            </div>

            {/* Resume */}
            <div className="card cp">
              <div className="ct">Resume</div>
              {candidate.resume_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 28 }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Resume uploaded</div>
                    <a
                      href={`http://localhost:5000${candidate.resume_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}
                    >
                      View / Download →
                    </a>
                  </div>
                  {canManage && (
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) resumeMutation.mutate(f);
                        }}
                      />
                      <span className="btn btn-sec btn-sm">Replace</span>
                    </label>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
                  <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 12 }}>No resume uploaded yet</div>
                  {canManage && (
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) resumeMutation.mutate(f);
                        }}
                      />
                      <span className="btn btn-sec btn-sm">
                        {resumeMutation.isPending ? 'Uploading…' : '↑ Upload Resume'}
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="card cp">
              <div className="ct">Record Info</div>
              <InfoRow label="Added"   value={formatDate(candidate.created_at)} />
              <InfoRow label="Updated" value={formatDate(candidate.updated_at)} />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CandidateFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        candidate={candidate}
      />
      <StatusMoveModal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        candidate={candidate}
      />
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Candidate"
        subtitle={`Remove ${candidate.candidate_name}?`}
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
          ⚠ Soft delete — the record is preserved in audit logs.
        </div>
      </Modal>
    </AppShell>
  );
}
