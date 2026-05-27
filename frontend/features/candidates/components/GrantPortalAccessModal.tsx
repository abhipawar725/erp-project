'use client';
import { useEffect, useState } from 'react';
import { Modal }               from '../../../components/ui/Modal';
import { useGrantPortalAccess } from '../hooks/useCandidates';
import type { Candidate }       from '../types/candidate.types';

interface Props {
  open:      boolean;
  onClose:   () => void;
  candidate: Candidate | null;
}

export function GrantPortalAccessModal({ open, onClose, candidate }: Props) {
  const [customPwd,    setCustomPwd]    = useState('');
  const [useCustomPwd, setUseCustomPwd] = useState(false);
  const [sendEmail,    setSendEmail]    = useState(true);
  const [showResult,   setShowResult]   = useState(false);
  const [resultData,   setResultData]   = useState<{
    temp_password: string; email_sent: boolean; is_new_access: boolean;
  } | null>(null);

  const grantMutation = useGrantPortalAccess(candidate?.id ?? 0);
  const isBusy        = grantMutation.isPending;
  const isNewUser     = !candidate?.is_portal_user;

  // Reset on open
  useEffect(() => {
    if (open) {
      setCustomPwd('');
      setUseCustomPwd(false);
      setSendEmail(true);
      setShowResult(false);
      setResultData(null);
    }
  }, [open]);

  const handleGrant = async () => {
    const res = await grantMutation.mutateAsync({
      password:   useCustomPwd && customPwd.trim() ? customPwd.trim() : undefined,
      send_email: sendEmail,
    });
    setResultData(res.data);
    setShowResult(true);
  };

  const handleDone = () => {
    setShowResult(false);
    onClose();
  };

  if (!candidate) return null;

  return (
    <Modal
      open={open}
      onClose={!showResult ? onClose : handleDone}
      title={isNewUser ? 'Grant Portal Access' : 'Reset Portal Password'}
      subtitle={
        isNewUser
          ? `Create a candidate portal account for ${candidate.candidate_name}`
          : `Reset the portal password for ${candidate.candidate_name}`
      }
      width={480}
      footer={
        showResult ? (
          <button className="btn btn-pri" onClick={handleDone}>Done</button>
        ) : (
          <>
            <button className="btn btn-sec" onClick={onClose} disabled={isBusy}>Cancel</button>
            <button
              className="btn btn-pri"
              onClick={handleGrant}
              disabled={isBusy || !candidate.email || (useCustomPwd && customPwd.trim().length < 6)}
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            >
              {isBusy && <Spinner />}
              {isBusy ? 'Granting…' : isNewUser ? '🌐 Grant Access' : '🔑 Reset Password'}
            </button>
          </>
        )
      }
    >
      {/* ── Success result view ──────────────────────────────── */}
      {showResult && resultData ? (
        <div>
          <div style={{
            background: 'var(--green-lt)', border: '1px solid var(--green-bd)',
            borderRadius: 'var(--r2)', padding: '16px 18px', marginBottom: 16,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>
                {resultData.is_new_access ? 'Portal access granted!' : 'Password reset successfully!'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--green)', opacity: .85 }}>
                {resultData.email_sent
                  ? `Credentials have been emailed to ${candidate.email}`
                  : 'No email sent — share credentials manually'}
              </div>
            </div>
          </div>

          {/* Credentials box */}
          <div style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r2)', padding: '16px 18px', marginBottom: 4,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', marginBottom: 12 }}>
              Portal Login Credentials
            </div>
            {[
              { label: 'Portal URL',        value: `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/login` },
              { label: 'Username / Email',  value: candidate.email },
              { label: 'Password',          value: resultData.temp_password },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12, gap: 10 }}>
                <span style={{ color: 'var(--ink4)', fontWeight: 500, flexShrink: 0 }}>{row.label}</span>
                <span
                  style={{
                    fontFamily: row.label === 'Password' ? 'monospace' : 'inherit',
                    fontWeight: row.label === 'Password' ? 700 : 500,
                    color: row.label === 'Password' ? 'var(--purple)' : 'var(--ink)',
                    background: row.label === 'Password' ? 'var(--purple-lt)' : 'transparent',
                    padding: row.label === 'Password' ? '2px 8px' : undefined,
                    borderRadius: row.label === 'Password' ? 4 : undefined,
                    cursor: 'pointer',
                    wordBreak: 'break-all',
                    textAlign: 'right',
                  }}
                  title="Click to copy"
                  onClick={() => { if (row.value) navigator.clipboard.writeText(row.value); }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 6 }}>
            Click any value to copy. Advise the candidate to change their password after first login.
          </div>
        </div>
      ) : (
        /* ── Grant form view ──────────────────────────────────── */
        <>
          {/* No email warning */}
          {!candidate.email ? (
            <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: 12, color: 'var(--red)' }}>
              ⚠ This candidate has no email address. Portal access can be granted but credentials cannot be emailed.
              Please add an email to the candidate profile first.
            </div>
          ) : (
            /* Status banner */
            <div style={{
              background: isNewUser ? 'var(--blue-lt)' : 'var(--amber-lt)',
              border: `1px solid ${isNewUser ? 'var(--blue-md)' : 'var(--amber-bd)'}`,
              borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 16,
              fontSize: 12, color: isNewUser ? 'var(--blue)' : 'var(--amber)',
            }}>
              {isNewUser ? (
                <>🌐 <strong>{candidate.candidate_name}</strong> does not yet have portal access. A new account will be created.</>
              ) : (
                <>🔑 <strong>{candidate.candidate_name}</strong> already has portal access. This will reset their password.</>
              )}
            </div>
          )}

          {/* Password option */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={useCustomPwd}
                onChange={e => setUseCustomPwd(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: 'var(--blue)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12, color: 'var(--ink2)' }}>Set a custom password</span>
            </label>

            {useCustomPwd ? (
              <div className="fg" style={{ marginBottom: 0 }}>
                <label>Custom password <span style={{ color: 'var(--red)' }}>*</span></label>
                <input
                  type="text"
                  placeholder="Min 6 characters"
                  value={customPwd}
                  onChange={e => setCustomPwd(e.target.value)}
                  autoFocus
                  autoComplete="new-password"
                />
                {useCustomPwd && customPwd.trim().length > 0 && customPwd.trim().length < 6 && (
                  <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>Minimum 6 characters</span>
                )}
              </div>
            ) : (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '9px 12px', fontSize: 12, color: 'var(--ink4)' }}>
                A secure random password will be auto-generated.
              </div>
            )}
          </div>

          {/* Send email toggle */}
          {candidate.email && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r2)',
              marginBottom: 14,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                  📧 Send credentials via email
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>
                  Send login URL, email and password to <strong>{candidate.email}</strong>
                </div>
              </div>
              <label style={{ position: 'relative', width: 40, height: 22, flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={e => setSendEmail(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                />
                <div
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 99, cursor: 'pointer',
                    background: sendEmail ? 'var(--green)' : 'var(--border2)',
                    transition: 'background .2s',
                  }}
                  onClick={() => setSendEmail(!sendEmail)}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: sendEmail ? 18 : 3,
                    width: 16, height: 16, background: '#fff', borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s',
                  }} />
                </div>
              </label>
            </div>
          )}

          {/* Email preview */}
          {candidate.email && sendEmail && (
            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r2)', padding: '12px 14px', fontSize: 12, color: 'var(--ink3)',
            }}>
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Email will contain:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  '📎 Portal login URL',
                  `👤 Username: ${candidate.email}`,
                  `🔑 Password: ${useCustomPwd && customPwd.trim() ? customPwd.trim() : '(auto-generated — shown after granting)'}`,
                  '💡 Note to change password after first login',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0 }}>{item.split(' ')[0]}</span>
                    <span>{item.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!sendEmail && candidate.email && (
            <div style={{ background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--amber)', marginTop: 14 }}>
              ⚠ Email is disabled. You will need to manually share the generated credentials with the candidate after granting access.
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
      width: 12, height: 12, border: '2px solid rgba(255,255,255,.35)',
      borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
      animation: 'spin .65s linear infinite',
    }} />
  );
}
