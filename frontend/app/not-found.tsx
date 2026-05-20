'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          router.push('/dashboard');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  const QUICK_LINKS = [
    { href: '/dashboard',    icon: '⬡', label: 'Dashboard'   },
    { href: '/employees',    icon: '👥', label: 'Employees'   },
    { href: '/attendance',   icon: '◔', label: 'Attendance'  },
    { href: '/leaves',       icon: '◑', label: 'Leaves'      },
    { href: '/payroll',      icon: '₹', label: 'Payroll'     },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: 'var(--font)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background decoration */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        {/* Large faint 404 */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(180px, 35vw, 320px)',
          fontWeight: 700,
          fontFamily: 'var(--mono)',
          color: 'var(--border)',
          letterSpacing: '-0.05em',
          lineHeight: 1,
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}>
          404
        </div>

        {/* Floating dots */}
        {mounted && [
          { size: 6,  top: '15%', left: '10%', color: 'var(--blue-md)',    delay: '0s',   dur: '4s'  },
          { size: 10, top: '25%', left: '85%', color: 'var(--purple-bd)', delay: '0.8s', dur: '5s'  },
          { size: 7,  top: '70%', left: '8%',  color: 'var(--green-bd)',  delay: '1.2s', dur: '4.5s'},
          { size: 5,  top: '80%', left: '88%', color: 'var(--amber-bd)',  delay: '0.4s', dur: '3.8s'},
          { size: 8,  top: '12%', left: '50%', color: 'var(--teal-bd)',   delay: '1.6s', dur: '5.5s'},
          { size: 4,  top: '60%', left: '92%', color: 'var(--pink-bd)',   delay: '0.2s', dur: '4.2s'},
        ].map((dot, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: dot.top, left: dot.left,
            width: dot.size, height: dot.size,
            borderRadius: '50%',
            background: dot.color,
            animation: `float ${dot.dur} ease-in-out ${dot.delay} infinite alternate`,
          }} />
        ))}
      </div>

      {/* Main card */}
      <div style={{
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r3)',
        padding: 'clamp(28px, 5vw, 48px) clamp(24px, 5vw, 52px)',
        maxWidth: 520,
        width: '100%',
        boxShadow: 'var(--sh3)',
        textAlign: 'center',
      }}>

        {/* NexHR logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'var(--blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff',
            flexShrink: 0,
          }}>
            NX
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.3px' }}>NexHR ERP</div>
            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Enterprise Suite</div>
          </div>
        </div>

        {/* Error badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--red-lt)', border: '1px solid var(--red-bd)',
          borderRadius: 99, padding: '4px 14px', marginBottom: 20,
          fontSize: 11, fontWeight: 700, color: 'var(--red)',
          letterSpacing: '.06em', textTransform: 'uppercase',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
          Error 404
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 'clamp(22px, 4vw, 30px)',
          fontWeight: 700,
          color: 'var(--ink)',
          letterSpacing: '-.5px',
          margin: '0 0 12px',
          lineHeight: 1.2,
        }}>
          Page not found
        </h1>

        <p style={{
          fontSize: 13,
          color: 'var(--ink4)',
          lineHeight: 1.7,
          margin: '0 0 32px',
          maxWidth: 360,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Double-check the URL or use the links below.
        </p>

        {/* Primary CTA */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            width: '100%',
            padding: '11px 0',
            background: 'var(--blue)',
            border: 'none',
            borderRadius: 'var(--r)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 12,
            transition: 'background .12s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--blue-dk)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--blue)'; }}
        >
          ← Back to Dashboard
          {mounted && countdown > 0 && (
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--mono)',
              background: 'rgba(255,255,255,.2)',
              borderRadius: 99,
              padding: '2px 8px',
            }}>
              {countdown}s
            </span>
          )}
        </button>

        <button
          onClick={() => router.back()}
          style={{
            width: '100%',
            padding: '10px 0',
            background: 'transparent',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--r)',
            color: 'var(--ink3)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font)',
            cursor: 'pointer',
            marginBottom: 28,
            transition: 'all .12s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'var(--surface2)';
            el.style.color = 'var(--ink)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'transparent';
            el.style.color = 'var(--ink3)';
          }}
        >
          ↩ Go back
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--ink4)', whiteSpace: 'nowrap' }}>
            or jump to
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Quick links grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
        }}>
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                padding: '10px 4px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r)',
                textDecoration: 'none',
                transition: 'all .12s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'var(--blue-lt)';
                el.style.borderColor = 'var(--blue-md)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'var(--surface2)';
                el.style.borderColor = 'var(--border)';
              }}
            >
              <span style={{ fontSize: 16 }}>{link.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink3)' }}>
                {link.label}
              </span>
            </Link>
          ))}
        </div>

      </div>

      {/* Footer */}
      <div style={{
        marginTop: 24,
        fontSize: 11,
        color: 'var(--ink4)',
        textAlign: 'center',
      }}>
        © {new Date().getFullYear()} NexHR ERP · Enterprise Human Resource Management
      </div>

      <style>{`
        @keyframes float {
          from { transform: translateY(0px);   opacity: .5; }
          to   { transform: translateY(-14px); opacity: 1;  }
        }
      `}</style>
    </div>
  );
}