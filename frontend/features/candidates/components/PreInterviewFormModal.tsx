'use client';
import { Modal }  from '../../../components/ui/Modal';
import { useSendPreInterviewForm } from '../hooks/useCandidates';
import type { Candidate } from '../types/candidate.types';

interface Props {
  open:      boolean;
  onClose:   () => void;
  candidate: Candidate | null;
}

export function PreInterviewFormModal({ open, onClose, candidate }: Props) {
  const sendMutation = useSendPreInterviewForm(candidate?.id ?? 0);
  const isBusy       = sendMutation.isPending;

  const handleSend = async () => {
    await sendMutation.mutateAsync();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send Pre-Interview Form"
      subtitle={`Request ${candidate?.candidate_name ?? ''} to fill the pre-interview declaration form`}
      width={460}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose} disabled={isBusy}>Cancel</button>
          <button
            className="btn btn-pri"
            onClick={handleSend}
            disabled={isBusy || !candidate?.email}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            {isBusy && <Spinner />}
            {isBusy ? 'Sending…' : '📋 Send Form Link'}
          </button>
        </>
      }
    >
      {!candidate?.email ? (
        <div style={{
          background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)',
          borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 12, color: 'var(--amber)',
        }}>
          ⚠ This candidate has no email address. Please add an email before sending the form link.
        </div>
      ) : (
        <>
          <div style={{
            background: 'var(--blue-lt)', border: '1px solid var(--blue-md)',
            borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 14,
            fontSize: 12, color: 'var(--blue)',
          }}>
            📧 An email with a secure portal link will be sent to <strong>{candidate.email}</strong>.
            <br />The candidate will be able to complete the pre-interview declaration form on their portal.
          </div>

          <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.7 }}>
            The form includes:
            <ul style={{ marginTop: 6, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <li>Personal details &amp; identity documents</li>
              <li>Current address &amp; permanent address</li>
              <li>Employment history &amp; references</li>
              <li>Family details</li>
              <li>COVID vaccination status</li>
              <li>Legal declaration &amp; signature</li>
            </ul>
          </div>

          {/* Portal access note */}
          {!candidate.is_portal_user && (
            <div style={{
              background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)',
              borderRadius: 'var(--r)', padding: '10px 14px', marginTop: 14,
              fontSize: 12, color: 'var(--amber)',
            }}>
              🔑 Portal access will be automatically created for this candidate along with the form link.
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 12, height: 12,
      border: '2px solid rgba(255,255,255,.35)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin .65s linear infinite',
    }} />
  );
}
