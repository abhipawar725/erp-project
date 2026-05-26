'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loginSchema, LoginFormData } from '@/validations/auth.schema';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggingIn, loginError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginFormData) => {
    login(data);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        fontFamily: 'var(--font)',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r3)',
          padding: '36px 40px',
          width: 400,
          boxShadow: 'var(--sh3)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div className="sb-mark" style={{ width: 40, height: 40, fontSize: 14 }}>NX</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.3px' }}>
              UNG ERP
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Enterprise Suite</div>
          </div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 4, letterSpacing: '-.3px' }}>
          Sign in
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 24 }}>
          Access your HR workspace
        </div>

        {/* API Error */}
        {loginError && (
          <div
            style={{
              background: 'var(--red-lt)', border: '1px solid var(--red-bd)',
              borderRadius: 'var(--r)', padding: '10px 14px',
              fontSize: 12, color: 'var(--red)', marginBottom: 16,
            }}
          >
            {(loginError as any)?.message || 'Login failed. Please try again.'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="fg">
            <label>Email Address *</label>
            <input
              type="email"
              placeholder="you@company.com"
              {...register('email')}
              autoComplete="email"
            />
            {errors.email && <span className="err">{errors.email.message}</span>}
          </div>

          <div className="fg">
            <label>Password *</label>
            <input
              type="password"
              placeholder="••••••••"
              {...register('password')}
              autoComplete="current-password"
            />
            {errors.password && <span className="err">{errors.password.message}</span>}
          </div>

          <div
            style={{
              display: 'flex', justifyContent: 'flex-end',
              marginBottom: 20, marginTop: -4,
            }}
          >
            <span
              style={{ fontSize: 11, color: 'var(--blue)', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => router.push('/forgot-password')}
            >
              Forgot password?
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-pri"
            style={{ width: '100%', justifyContent: 'center', padding: '9px 0', fontSize: 13 }}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div
          style={{
            marginTop: 20, paddingTop: 16,
            borderTop: '1px solid var(--border)',
            fontSize: 11, color: 'var(--ink4)', textAlign: 'center',
          }}
        >
          © 2026 NexHR ERP · Enterprise Human Resource Management
        </div>
      </div>
    </div>
  );
}
