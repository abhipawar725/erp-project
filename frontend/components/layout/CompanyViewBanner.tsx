'use client';
/**
 * CompanyViewBanner
 *
 * Shown at the very top of AppShell when a super admin has switched into a company.
 * Stays fixed above the topbar so it's always visible.
 * The "Exit" button calls POST /api/super/exit-company and returns to /super-admin.
 */
import { useAppSelector }       from '../../store';
import { selectIsViewingCompany, selectViewingCompany } from '../../store/slices/authSlice';
import { useSuperAdminSwitch }  from '../../features/auth/hooks/useAuth';

export function CompanyViewBanner() {
  const isViewing   = useAppSelector(selectIsViewingCompany);
  const viewing     = useAppSelector(selectViewingCompany);
  const { exitCompany, isExiting } = useSuperAdminSwitch();

  if (!isViewing) return null;

  return (
    <div style={{
      position:       'fixed',
      top:            0,
      left:           0,
      right:          0,
      zIndex:         9999,
      height:         36,
      background:     'linear-gradient(90deg, #6c31d9, #cc2a2a)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            12,
      fontSize:       12,
      fontWeight:     600,
      color:          '#fff',
      fontFamily:     'var(--font)',
      userSelect:     'none',
      boxShadow:      '0 2px 8px rgba(0,0,0,.25)',
    }}>
      {/* Left pulse dot */}
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', opacity: .7, animation: 'banner-pulse 1.5s ease-in-out infinite', display: 'inline-block' }} />

      <span style={{ opacity: .75 }}>👁 Viewing as</span>

      <span style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 6, padding: '2px 12px', letterSpacing: '.02em' }}>
        {viewing.name}
      </span>

      <span style={{ opacity: .6, fontSize: 11 }}>— Super Admin Mode</span>

      <button
        onClick={() => exitCompany()}
        disabled={isExiting}
        style={{
          marginLeft:   8,
          padding:      '3px 14px',
          border:       '1px solid rgba(255,255,255,.45)',
          borderRadius: 6,
          background:   'rgba(255,255,255,.12)',
          color:        '#fff',
          fontFamily:   'var(--font)',
          fontSize:     11,
          fontWeight:   700,
          cursor:       isExiting ? 'wait' : 'pointer',
          transition:   'background .1s',
          letterSpacing: '.03em',
        }}
        onMouseEnter={e => { if (!isExiting) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.25)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.12)'; }}
      >
        {isExiting ? '…' : '✕ Exit'}
      </button>

      <style>{`
        @keyframes banner-pulse {
          0%, 100% { opacity: .4; transform: scale(1); }
          50%       { opacity: 1;  transform: scale(1.25); }
        }
      `}</style>
    </div>
  );
}
