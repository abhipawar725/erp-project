'use client';
import { useState } from 'react';
import { Modal }    from '../../../components/ui/Modal';
import { useSendAptitudeTestLink } from '../hooks/useCandidates';
import { useAptitudeTests }        from '../../ats-tests/hooks/useAtsTests';
import type { Candidate }          from '../types/candidate.types';

interface Props {
  open:      boolean;
  onClose:   () => void;
  candidate: Candidate | null;
}

export function AptitudeTestSendModal({ open, onClose, candidate }: Props) {
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const sendMutation = useSendAptitudeTestLink(candidate?.id ?? 0);
  const { data: tests = [], isLoading } = useAptitudeTests();

  const activeTests = tests.filter(t => t.is_active);

  const handleSend = async () => {
    if (!selectedTestId) return;
    await sendMutation.mutateAsync(selectedTestId);
    setSelectedTestId(null);
    onClose();
  };

  const isBusy = sendMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={() => { setSelectedTestId(null); onClose(); }}
      title="Send Aptitude Test"
      subtitle={`Assign an aptitude test to ${candidate?.candidate_name ?? ''}. A portal link will be emailed.`}
      width={460}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose} disabled={isBusy}>Cancel</button>
          <button
            className="btn btn-pri"
            onClick={handleSend}
            disabled={!selectedTestId || isBusy}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            {isBusy && <Spinner />}
            {isBusy ? 'Sending…' : '🧠 Send Test Link'}
          </button>
        </>
      }
    >
      {!candidate?.email ? (
        <div style={{ background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 12, color: 'var(--amber)' }}>
          ⚠ This candidate has no email address. Please add an email before sending the test.
        </div>
      ) : (
        <>
          {/* Already attempted note */}
          {candidate.aptitude_attempted_at && (
            <div style={{ background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--amber)', marginBottom: 14 }}>
              ⚠ This candidate has already completed an aptitude test on {new Date(candidate.aptitude_attempted_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}.
              Sending a new link will allow them to attempt again.
            </div>
          )}

          {/* Previously sent note */}
          {!candidate.aptitude_attempted_at && candidate.aptitude_test_sent && (
            <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--blue)', marginBottom: 14 }}>
              ℹ Test link already sent on {candidate.aptitude_test_sent_at ? new Date(candidate.aptitude_test_sent_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}. You can resend a different test.
            </div>
          )}

          {/* Test selector */}
          <div className="fg">
            <label>Select Test *</label>
            {isLoading ? (
              <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--ink4)' }}>Loading tests…</div>
            ) : activeTests.length === 0 ? (
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 12, color: 'var(--ink4)', textAlign: 'center' }}>
                No active aptitude tests found.
                <a href="/ats-tests" style={{ color: 'var(--blue)', marginLeft: 6, fontWeight: 600 }}>Create one →</a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {activeTests.map(test => {
                  const isSelected = selectedTestId === test.id;
                  return (
                    <label
                      key={test.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px',
                        border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                        borderRadius: 'var(--r)',
                        background: isSelected ? 'var(--blue-lt)' : 'var(--surface2)',
                        cursor: 'pointer', transition: 'all .1s',
                      }}
                    >
                      <input
                        type="radio"
                        name="test_select"
                        checked={isSelected}
                        onChange={() => setSelectedTestId(test.id)}
                        style={{ width: 15, height: 15, accentColor: 'var(--blue)', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--blue)' : 'var(--ink)' }}>
                          {test.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span>⏱ {test.duration_minutes} min</span>
                          <span>📊 {test.total_marks} marks</span>
                          <span>❓ {test.questions?.length ?? 0} questions</span>
                          {test.pass_marks != null && <span>Pass: {test.pass_marks}</span>}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--blue)' }}>
            📧 An email with a secure test link will be sent to <strong>{candidate.email}</strong>.
            Portal access will be created automatically if not already done.
            The candidate will <strong>not</strong> see their score.
          </div>
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  );
}

function Spinner() {
  return (
    <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .65s linear infinite' }} />
  );
}
