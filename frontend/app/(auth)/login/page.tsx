'use client';
import { useState, useEffect, useRef } from 'react';
import { useOtpLogin } from '../../../features/auth/hooks/useAuth';

export default function LoginPage() {
  const {
    step, contact, error, expiresIn,
    requestOtp, verifyOtp,
    isRequesting, isVerifying,
    resetToRequest,
  } = useOtpLogin();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otp, setOtp]                   = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown]       = useState(0);
  const inputRefs                       = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown after OTP sent
  useEffect(() => {
    if (step === 'verify' && expiresIn > 0) {
      setCountdown(expiresIn);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, expiresIn]);

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (otp.every(d => d !== '') && step === 'verify') {
      verifyOtp(otp.join(''));
    }
  }, [otp]);

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  }

  function handleResend() {
    setOtp(['', '', '', '', '', '']);
    requestOtp(contact);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const canResend = countdown <= 540; // allow resend after 60s

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', fontFamily: 'var(--font)',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r3)', padding: '36px 40px',
        width: 400, boxShadow: 'var(--sh3)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div className="sb-mark" style={{ width: 40, height: 40, fontSize: 14 }}>NX</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.3px' }}>
              NexHR ERP
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Enterprise Suite</div>
          </div>
        </div>

        {/* ── STEP 1: Enter email or phone ─────────────────── */}
        {step === 'request' && (
          <>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 4, letterSpacing: '-.3px' }}>
              Sign in
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 24 }}>
              Enter your work email or phone number
            </div>

            {error && (
              <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div className="fg">
              <label>Email or Phone Number</label>
              <input
                autoFocus
                type="text"
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && emailOrPhone.trim() && requestOtp(emailOrPhone.trim())}
                placeholder="name@company.com or +91 9999999999"
              />
            </div>

            <button
              className="btn btn-pri"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 13, marginTop: 4 }}
              onClick={() => emailOrPhone.trim() && requestOtp(emailOrPhone.trim())}
              disabled={!emailOrPhone.trim() || isRequesting}
            >
              {isRequesting ? 'Sending OTP…' : 'Send OTP →'}
            </button>
          </>
        )}

        {/* ── STEP 2: Enter OTP ────────────────────────────── */}
        {step === 'verify' && (
          <>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 4, letterSpacing: '-.3px' }}>
              Enter OTP
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 6 }}>
              Sent to <strong style={{ color: 'var(--ink)' }}>{contact}</strong>
            </div>
            <div style={{ fontSize: 11, color: countdown > 0 ? 'var(--blue)' : 'var(--red)', marginBottom: 24 }}>
              {countdown > 0 ? `Expires in ${fmt(countdown)}` : 'OTP expired — request a new one'}
            </div>

            {error && (
              <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>
                {error}
              </div>
            )}

            {/* 6-digit OTP boxes */}
            <div
              style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}
              onPaste={handleOtpPaste}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  autoFocus={i === 0}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  style={{
                    width: 46, height: 52,
                    textAlign: 'center',
                    fontSize: 22, fontWeight: 700,
                    fontFamily: 'var(--mono)',
                    border: `2px solid ${digit ? 'var(--blue)' : 'var(--border2)'}`,
                    borderRadius: 'var(--r)',
                    background: digit ? 'var(--blue-lt)' : 'var(--surface)',
                    color: 'var(--ink)',
                    outline: 'none',
                    transition: 'all .1s',
                  }}
                />
              ))}
            </div>

            <button
              className="btn btn-pri"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 13, marginBottom: 14 }}
              onClick={() => verifyOtp(otp.join(''))}
              disabled={otp.some(d => !d) || isVerifying || countdown === 0}
            >
              {isVerifying ? 'Verifying…' : '✓ Verify & Sign In'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <button
                onClick={resetToRequest}
                style={{ background: 'none', border: 'none', color: 'var(--ink4)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12, padding: 0 }}
              >
                ← Change email / phone
              </button>
              <button
                onClick={handleResend}
                disabled={!canResend || isRequesting}
                style={{ background: 'none', border: 'none', color: canResend ? 'var(--blue)' : 'var(--ink4)', cursor: canResend ? 'pointer' : 'default', fontFamily: 'var(--font)', fontSize: 12, padding: 0 }}
              >
                {canResend ? 'Resend OTP' : `Resend in ${fmt(countdown - 540)}`}
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--ink4)', textAlign: 'center' }}>
          © 2026 NexHR ERP · Enterprise Human Resource Management
        </div>
      </div>
    </div>
  );
}
