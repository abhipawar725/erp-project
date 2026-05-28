'use client';
import { useEffect }   from 'react';
import { useRouter }   from 'next/navigation';
import { useAppDispatch } from '../../../store';
import { setPageTitle }   from '../../../store/slices/uiSlice';
import { AppShell }       from '../../../layouts/AppLayout';
import { useRoles, useModules } from '../../../hooks/useRbac';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  useEffect(() => { dispatch(setPageTitle({ title: 'Settings', breadcrumb: 'HRMS' })); }, [dispatch]);

  const { data: roles   = [] } = useRoles();
  const { data: modules = [] } = useModules();

  const customRoles  = roles.filter(r => !r.is_system);
  const systemRoles  = roles.filter(r => r.is_system);
  const totalMembers = roles.reduce((s, r) => s + (r.member_count || 0), 0);

  const sections = [
    {
      title:'Access Control', items:[
        { title:'Roles & Groups',       icon:'🔑', href:'/settings/roles',       color:'var(--blue)',   desc:'Custom roles, permissions, team assignments', stats: [`${customRoles.length} custom`, `${systemRoles.length} system`] },
        { title:'Form Builder',         icon:'🧩', href:'/settings/forms',       color:'var(--green)',  desc:'Dynamic forms with 17 field types', stats: [`${modules.length} modules`, `${modules.reduce((s, m) => s + (m.forms?.length||0), 0)} forms`] },
        { title:'Permission Matrix',    icon:'🔐', href:'/settings/permissions', color:'var(--purple)', desc:'Field-level View/Edit/Copy/Mask per role', stats: ['5 flags', `${roles.length} roles`] },
      ],
    },
    {
      title:'Communication', items:[
        { title:'Email Templates',      icon:'📧', href:'/settings/email-templates', color:'var(--teal)',   desc:'Branded email templates for all flows', stats:['19 types','Branding'] },
      ],
    },
  ];

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Settings</h1>
            <p>System configuration, access control, and company preferences</p>
          </div>
        </div>

        {sections.map(sec => (
          <div key={sec.title} style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', marginBottom:12 }}>{sec.title}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:14 }}>
              {sec.items.map(item => (
                <div key={item.href} onClick={() => router.push(item.href)}
                  style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r3)', padding:'18px 20px', cursor:'pointer', transition:'all .12s', boxShadow:'var(--sh)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = item.color; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sh2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sh)'; }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                    <div style={{ width:36, height:36, borderRadius:'var(--r)', background:`${item.color}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{item.icon}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{item.title}</div>
                  </div>
                  <div style={{ fontSize:12, color:'var(--ink4)', marginBottom:10, lineHeight:1.5 }}>{item.desc}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {item.stats.map(s => (
                      <span key={s} style={{ fontSize:10, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:99, padding:'2px 8px', color:'var(--ink4)', fontWeight:500 }}>{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
