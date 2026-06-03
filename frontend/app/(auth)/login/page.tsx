'use client';
import { useState, useEffect, useRef } from 'react';
import { useOtpLogin } from '../../features/auth/hooks/useAuth';

export default function LoginPage() {
  const {
    step, contact, error, expiresIn,
    requestOtp, verifyOtp,
    isRequesting, isVerifying,
    resetToRequest,
  } = useOtpLogin();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otp, setOtp]                   = useState(['','','','','','']);
  const [countdown, setCountdown]        = useState(0);
  const inputRefs                        = useRef<(HTMLInputElement|null)[]>([]);

  // Countdown timer after OTP sent
  useEffect(() => {
    if (step === 'verify' && expiresIn > 0) {
      setCountdown(expiresIn);
      const interval = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, expiresIn]);

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (otp.every(d => d !== '')) {
      verifyOtp(otp.join(''));
    }
  }, [otp]);

  // OTP input handler
  function handleOtpInput(index: number, value: string) {
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
    const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  }

  const formatCountdown = (s: number) =>
    `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: 'var(--font)',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r3)', padding: '40px 36px', boxShadow: 'var(--sh2)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#185FA5,#1D9E75)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 auto 12px' }}>N</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.4px' }}>NexHR ERP</div>
          <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 4 }}>Enterprise HR Suite</div>
        </div>

        {/* ── STEP 1: Request OTP ─────────────────────────────────────── */}
        {step === 'request' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Sign in to your account</div>
              <div style={{ fontSize: 12, color: 'var(--ink4)' }}>Enter your work email or phone. We'll send a one-time code.</div>
            </div>

            <div className="fg">
              <label>Email or Phone Number</label>
              <input
                type="text"
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && emailOrPhone && requestOtp(emailOrPhone)}
                placeholder="name@company.com or +91 9999999999"
                autoFocus
                style={{ fontSize: 13 }}
              />
            </div>

            {error && (
              <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '9px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-pri"
              onClick={() => emailOrPhone && requestOtp(emailOrPhone)}
              disabled={!emailOrPhone.trim() || isRequesting}
              style={{ width: '100%', justifyContent: 'center', height: 40, fontSize: 13 }}
            >
              {isRequesting ? 'Sending…' : 'Send OTP →'}
            </button>
          </>
        )}

        {/* ── STEP 2: Verify OTP ──────────────────────────────────────── */}
        {step === 'verify' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Enter your OTP</div>
              <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.5 }}>
                A 6-digit code was sent to <strong>{contact}</strong>
                {countdown > 0 && <span style={{ color: 'var(--blue)', marginLeft: 4 }}>· expires in {formatCountdown(countdown)}</span>}
                {countdown === 0 && <span style={{ color: 'var(--red)', marginLeft: 4 }}>· expired</span>}
              </div>
            </div>

            {/* 6-box OTP input */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }} onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                  style={{
                    width: 44, height: 50, textAlign: 'center', fontSize: 20, fontWeight: 700,
                    fontFamily: 'var(--mono)', border: `2px solid ${digit ? 'var(--blue)' : 'var(--border2)'}`,
                    borderRadius: 'var(--r)', background: digit ? 'var(--blue-lt)' : 'var(--surface)',
                    color: 'var(--ink)', outline: 'none', transition: 'all .1s',
                  }}
                />
              ))}
            </div>

            {error && (
              <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '9px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 14, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-pri"
              onClick={() => verifyOtp(otp.join(''))}
              disabled={otp.some(d => !d) || isVerifying}
              style={{ width: '100%', justifyContent: 'center', height: 40, fontSize: 13, marginBottom: 12 }}
            >
              {isVerifying ? 'Verifying…' : '✓ Verify & Sign In'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <button
                onClick={() => resetToRequest()}
                style={{ background: 'none', border: 'none', color: 'var(--ink4)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12, padding: 0 }}>
                ← Change email/phone
              </button>
              <button
                onClick={() => { setOtp(['','','','','','']); requestOtp(contact); }}
                disabled={countdown > 540}  // allow resend after 60 seconds
                style={{ background: 'none', border: 'none', color: countdown > 540 ? 'var(--ink4)' : 'var(--blue)', cursor: countdown > 540 ? 'default' : 'pointer', fontFamily: 'var(--font)', fontSize: 12, padding: 0 }}>
                {countdown > 540 ? `Resend in ${formatCountdown(countdown - 540)}` : 'Resend OTP'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
