'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { portalService } from '../../../services/api/candidate.service';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode]       = useState<'password' | 'magic'>('password');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [devToken, setDevToken]   = useState('');
  const [error, setError]     = useState('');

  const loginMutation = useMutation({
    mutationFn: () => portalService.login(email, password),
    onSuccess: (res) => {
      localStorage.setItem('portal_token', res.data.token);
      localStorage.setItem('portal_name', res.data.candidateId.toString());
      router.push('/portal/dashboard');
    },
    onError: (err: any) => setError(err?.message || 'Invalid credentials'),
  });

  const magicMutation = useMutation({
    mutationFn: () => portalService.magicLink(email),
    onSuccess: (res) => {
      setMagicSent(true);
      if ((res as any)?.data?.magicToken) setDevToken((res as any).data.magicToken);
    },
    onError: (err: any) => setError(err?.message || 'Failed to send link'),
  });

  const isPending = loginMutation.isPending || magicMutation.isPending;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '36px 40px', width: 420, maxWidth: '100%', boxShadow: 'var(--sh3)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>UNG</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Candidate Portal</div>
            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>UNG HRMS · Recruitment</div>
          </div>
        </div>

        <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Welcome back</div>
        <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 24 }}>Track your application and interview status</div>

        {/* Mode tabs */}
        {/* <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 3, gap: 3, marginBottom: 22 }}>
          {(['password'] as const).map(m => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(''); setMagicSent(false); }}
              style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: mode === m ? 'var(--surface)' : 'transparent', color: mode === m ? 'var(--ink)' : 'var(--ink4)', boxShadow: mode === m ? 'var(--sh)' : 'none', fontFamily: 'var(--font)', transition: 'all .1s' }}>
              {'Password'}
            </button>
          ))}
        </div> */}

        {error && <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 14 }}>⚠ {error}</div>}

        {/* Magic link mode */}
        {mode === 'magic' && !magicSent && (
          <>
            <div className="fg"><label>Email address</label><input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus /></div>
            <button type="button" onClick={() => magicMutation.mutate()} disabled={!email || isPending}
              style={{ width: '100%', padding: '10px 0', background: !email || isPending ? 'var(--border2)' : 'var(--blue)', border: 'none', borderRadius: 'var(--r)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: !email || isPending ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
              {isPending ? 'Sending…' : 'Send Magic Link →'}
            </button>
          </>
        )}

        {mode === 'magic' && magicSent && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Check your inbox</div>
            <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.7, marginBottom: 16 }}>We sent a login link to <strong>{email}</strong>. It expires in 15 minutes.</div>
            {devToken && (
              <div style={{ background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 'var(--r)', padding: '10px 12px', fontSize: 11, color: 'var(--amber)', textAlign: 'left', marginBottom: 16 }}>
                <strong>DEV:</strong> <a href={`/portal/magic?token=${devToken}`} style={{ color: 'var(--blue)', wordBreak: 'break-all', fontFamily: 'var(--mono)' }}>/portal/magic?token={devToken.slice(0,20)}…</a>
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setMagicSent(false)}>Try different email</button>
          </div>
        )}

        {/* Password mode */}
        {mode === 'password' && (
          <>
            <div className="fg"><label>Email address</label><input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus /></div>
            <div className="fg"><label>Password</label><input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && loginMutation.mutate()} /></div>
            <button type="button" onClick={() => loginMutation.mutate()} disabled={!email || !password || isPending}
              style={{ width: '100%', padding: '10px 0', background: !email || !password || isPending ? 'var(--border2)' : 'var(--blue)', border: 'none', borderRadius: 'var(--r)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {isPending && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />}
              {isPending ? 'Signing in…' : 'Sign in →'}
            </button>
          </>
        )}

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--ink4)', textAlign: 'center' }}>
          Having trouble? Contact your HR representative.
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function PortalLoginPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>}><LoginContent /></Suspense>;
}