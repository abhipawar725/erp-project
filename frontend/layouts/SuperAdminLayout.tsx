'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector }         from '../store';
import { selectUser, selectIsAuthenticated } from '../store/slices/authSlice';
import { useAuth }                from '../features/auth/hooks/useAuth';

const SA_NAV = [
  { section: 'Platform', items: [
    { id:'sa-dash',      label:'Dashboard',         icon:'⬡', href:'/super-admin'           },
    // { id:'sa-companies', label:'Companies',          icon:'🏢', href:'/super-admin/companies' },
    // { id:'sa-analytics', label:'Analytics',          icon:'📊', href:'/super-admin/analytics' },
  ]},
  { section: 'Management', items: [
    // { id:'sa-billing',   label:'Billing & Plans',    icon:'💳', href:'/super-admin/billing'   },
    // { id:'sa-audit',     label:'Audit Logs',         icon:'🛡', href:'/super-admin/audit'     },
    // { id:'sa-settings',  label:'Platform Settings',  icon:'⚙',  href:'/super-admin/settings'  },
  ]},
];

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const router          = useRouter();
  const pathname        = usePathname();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user            = useAppSelector(selectUser);
  const { logout }      = useAuth();

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user && !user.isSuperAdmin) router.replace('/dashboard');
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) return null;

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>

      {/* ── Dark super admin sidebar ───────────────────────────────────── */}
      <aside style={{ width:224, flexShrink:0, background:'#0f1623', borderRight:'1px solid rgba(255,255,255,.07)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Brand mark */}
        <div style={{ padding:'16px 14px', borderBottom:'1px solid rgba(255,255,255,.08)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#6c31d9,#cc2a2a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff', flexShrink:0 }}>N</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#fff', letterSpacing:'-.3px' }}>NexHR</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.35)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginTop:1 }}>Platform Admin</div>
            </div>
          </div>

          {/* Super admin badge */}
          <div style={{ marginTop:10, background:'rgba(204,42,42,.18)', border:'1px solid rgba(204,42,42,.3)', borderRadius:7, padding:'7px 10px', display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#cc2a2a', flexShrink:0, boxShadow:'0 0 5px #cc2a2a' }} />
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.9)' }}>Super Admin</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.38)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{user.email}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {SA_NAV.map(section => (
            <div key={section.section} style={{ marginBottom:6 }}>
              <div style={{ padding:'8px 14px 4px', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(255,255,255,.28)' }}>
                {section.section}
              </div>
              {section.items.map(item => {
                const isActive = pathname === item.href || (item.href !== '/super-admin' && pathname.startsWith(item.href));
                return (
                  <div key={item.id} onClick={() => router.push(item.href)}
                    style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 14px', margin:'1px 8px', borderRadius:7, cursor:'pointer', transition:'all .1s', background: isActive ? 'rgba(108,49,217,.3)' : 'transparent', borderLeft: `3px solid ${isActive ? '#6c31d9' : 'transparent'}` }}>
                    <span style={{ fontSize:14, width:18, textAlign:'center', flexShrink:0, opacity:.75 }}>{item.icon}</span>
                    <span style={{ fontSize:12, fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : 'rgba(255,255,255,.5)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding:'10px 8px', borderTop:'1px solid rgba(255,255,255,.07)', flexShrink:0 }}>
          <div onClick={() => { logout(); router.replace('/login'); }}
            style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:7, cursor:'pointer', transition:'background .1s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ fontSize:13, opacity:.55 }}>↩</span>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.45)', fontWeight:500 }}>Log out</span>
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Topbar */}
        <header style={{ height:52, borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', padding:'0 20px', gap:12, flexShrink:0, boxShadow:'var(--sh)' }}>
          <div style={{ flex:1 }} />
          <div style={{ fontSize:10, fontWeight:700, padding:'3px 11px', borderRadius:99, background:'var(--red-lt)', color:'var(--red)', border:'1px solid var(--red-bd)', letterSpacing:'.05em', textTransform:'uppercase' }}>
            Platform Admin Mode
          </div>
        </header>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
