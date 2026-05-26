'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { portalService } from '../../../services/api/candidate.service';

function MagicVerify() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const mutation = useMutation({
    mutationFn: () => portalService.verifyMagic(token),
    onSuccess: (res) => {
      localStorage.setItem('portal_token', res.data.token);
      router.replace('/portal/dashboard');
    },
  });

  useEffect(() => {
    if (token) mutation.mutate();
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)' }}>
      <div style={{ textAlign: 'center' }}>
        {mutation.isPending && <><div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div><div style={{ fontSize: 14, fontWeight: 600 }}>Verifying your link…</div></>}
        {mutation.isError  && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)', marginBottom: 12 }}>Invalid or expired link</div>
            <button className="btn btn-sec" onClick={() => router.push('/portal/login')}>← Back to Login</button>
          </>
        )}
        {!token && <><div style={{ fontSize: 14, color: 'var(--red)' }}>No token in URL</div><button className="btn btn-sec btn-sm" style={{ marginTop: 12 }} onClick={() => router.push('/portal/login')}>← Login</button></>}
      </div>
    </div>
  );
}

export default function PortalMagicPage() {
  return <Suspense fallback={<div>Loading…</div>}><MagicVerify /></Suspense>;
}