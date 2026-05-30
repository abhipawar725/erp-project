'use client';

import { Modal } from '../../../components/ui/Modal';
import { useSendPreJoiningFormLink } from '../hooks/useCandidates';
import { formatDate } from '../../../utils/formatters';
import type { Candidate } from '../types/candidate.types';

interface Props {
  open: boolean;
  onClose: () => void;
  candidate: Candidate | null;
}

export function PreJoiningFormModal({
  open,
  onClose,
  candidate,
}: Props) {

  const sendMutation = useSendPreJoiningFormLink(candidate?.id ?? 0);

  if (!candidate) return null;

  const isSubmitted =
    candidate.prejoining_form_status === 'Submitted';

  const isDraft =
    candidate.prejoining_form_status === 'Draft';

  const hasSent = !!candidate.pre_joining_form_sent;

  const handleSend = async () => {
    await sendMutation.mutateAsync();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pre-Joining Form"
      subtitle={candidate.candidate_name}
      width={640}
      footer={
        <>
          <button
            className="btn btn-sec"
            onClick={onClose}
          >
            Close
          </button>

          <button
            className="btn btn-pri"
            onClick={handleSend}
            disabled={
              sendMutation.isPending ||
              !candidate.email
            }
          >
            {sendMutation.isPending
              ? 'Sending…'
              : hasSent
              ? '↩ Resend Form Link'
              : '📧 Send Form Link'}
          </button>
        </>
      }
    >

      {/* Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          background: isSubmitted
            ? 'var(--green-lt)'
            : isDraft
            ? 'var(--amber-lt)'
            : 'var(--surface2)',
          border: `1px solid ${
            isSubmitted
              ? 'var(--green-bd)'
              : isDraft
              ? 'var(--amber-bd)'
              : 'var(--border)'
          }`,
          borderRadius: 'var(--r)',
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: isSubmitted
                ? 'var(--green)'
                : isDraft
                ? 'var(--amber)'
                : 'var(--ink3)',
            }}
          >
            {isSubmitted
              ? '✅ Candidate already submitted the form'
              : isDraft
              ? '📝 Candidate saved draft form'
              : '⏳ Form not started yet'}
          </div>

          {candidate.prejoining_submitted_at && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--ink4)',
                marginTop: 2,
              }}
            >
              Submitted on{' '}
              {formatDate(
                candidate.prejoining_submitted_at
              )}
            </div>
          )}

          {hasSent &&
            candidate.pre_joining_form_sent_at && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ink4)',
                  marginTop: 2,
                }}
              >
                Link sent on{' '}
                {formatDate(
                  candidate.pre_joining_form_sent_at
                )}
              </div>
            )}
        </div>
      </div>

      {/* No Email */}
      {!candidate.email && (
        <div
          style={{
            background: 'var(--red-lt)',
            border: '1px solid var(--red-bd)',
            borderRadius: 'var(--r)',
            padding: '10px 14px',
            fontSize: 12,
            color: 'var(--red)',
            marginBottom: 14,
          }}
        >
          ⚠ Candidate has no email address.
        </div>
      )}

      {/* Offer Warning */}
      {!candidate.pre_joining_form_sent &&
        !candidate.offer_sent_at && (
          <div
            style={{
              background: 'var(--amber-lt)',
              border: '1px solid var(--amber-bd)',
              borderRadius: 'var(--r)',
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--amber)',
              marginBottom: 14,
            }}
          >
            ℹ Usually this form is sent after
            the offer letter.
          </div>
        )}

      {/* Email Info */}
      <div
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r2)',
          padding: '14px 16px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          📧 Email will be sent to:
          <strong>
            {' '}
            {candidate.email || '(No Email)'}
          </strong>
        </div>

        <div
          style={{
            fontSize: 12,
            color: 'var(--ink3)',
            lineHeight: 1.7,
          }}
        >
          Candidate will receive a secure
          portal link to complete the
          pre-joining form.
        </div>
      </div>

      {/* Portal Access */}
      {!candidate.is_portal_user ? (
        <div
          style={{
            background: 'var(--blue-lt)',
            border: '1px solid var(--blue-md)',
            borderRadius: 'var(--r)',
            padding: '10px 14px',
            fontSize: 12,
            color: 'var(--blue)',
          }}
        >
          ℹ Portal access will be created automatically.
        </div>
      ) : (
        <div
          style={{
            background: 'var(--green-lt)',
            border: '1px solid var(--green-bd)',
            borderRadius: 'var(--r)',
            padding: '10px 14px',
            fontSize: 12,
            color: 'var(--green)',
          }}
        >
          ✓ Candidate already has portal access.
        </div>
      )}
    </Modal>
  );
}