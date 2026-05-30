'use client';
/**
 * Super Admin — Company Management UI
 * Matches the Settings & RBAC screenshot design.
 * Only accessible when isSuperAdmin === true in auth state.
 */
import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../store';
import { setPageTitle }        from '../../../store/slices/uiSlice';
import { selectUser }          from '../../../store/slices/authSlice';
import { AppShell }            from '../../../layouts/AppLayout';
import { Modal }               from '../../../components/ui/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient               from '../../../services/api/client';
import { showToast }           from '../../../utils/toast';
import { formatDate }          from '../../../utils/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Company {
  id:                  number;
  name:                string;
  slug:                string | null;
  city?:               string | null;
  state?:              string | null;
  country:             string;
  industry?:           string | null;
  email?:              string | null;
  phone?:              string | null;
  subscription_plan:   'starter' | 'growth' | 'enterprise';
  max_employees:       number;
  is_active:           boolean;
  onboarding_step:     number;
  setup_completed_at?: string | null;
  live_user_count:     number;
  live_employee_count: number;
  created_at:          string;
  roles?:              { id:number; name:string; slug:string; is_system:boolean }[];
}

interface PlatformStats {
  totalCompanies:      number;
  activeCompanies:     number;
  suspendedCompanies:  number;
  totalUsers:          number;
  totalEmployees:      number;
  plans:               Record<string, number>;
}

// ─── RBAC matrix (matches screenshot) ────────────────────────────────────────
const RBAC_MATRIX = [
  { module:'Payroll',       HR:true,  ADMIN:true,  MGR:'view',  EMP:'view' },
  { module:'Recruitment',   HR:true,  ADMIN:true,  MGR:'view',  EMP:false  },
  { module:'Leave Approve', HR:true,  ADMIN:true,  MGR:true,    EMP:false  },
  { module:'Self-Service',  HR:true,  ADMIN:true,  MGR:true,    EMP:true   },
  { module:'Audit Logs',    HR:true,  ADMIN:true,  MGR:false,   EMP:false  },
  { module:'RBAC Settings', HR:false, ADMIN:true,  MGR:false,   EMP:false  },
];

// ─── Service ─────────────────────────────────────────────────────────────────
const superSvc = {
  stats:    () => apiClient.get<any, any>('/super/stats'),
  list:     (p?: any) => apiClient.get<any, any>('/super/companies', { params: p }),
  get:      (id: number) => apiClient.get<any, any>(`/super/companies/${id}`),
  create:   (d: any) => apiClient.post<any, any>('/super/companies', d),
  update:   (id: number, d: any) => apiClient.put<any, any>(`/super/companies/${id}`, d),
  suspend:  (id: number) => apiClient.post<any, any>(`/super/companies/${id}/suspend`),
  activate: (id: number) => apiClient.post<any, any>(`/super/companies/${id}/activate`),
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ active, step }: { active: boolean; step: number }) {
  if (!active) return <span style={{ fontSize:11, fontWeight:600, color:'var(--red)', background:'var(--red-lt)', border:'1px solid var(--red-bd)', borderRadius:99, padding:'2px 9px' }}>Suspended</span>;
  if (step < 5)  return <span style={{ fontSize:11, fontWeight:600, color:'var(--amber)', background:'var(--amber-lt)', border:'1px solid var(--amber-bd)', borderRadius:99, padding:'2px 9px' }}>Setup</span>;
  return <span style={{ fontSize:11, fontWeight:600, color:'var(--green)', background:'var(--green-lt)', border:'1px solid var(--green-bd)', borderRadius:99, padding:'2px 9px' }}>Active</span>;
}

// ─── Plan badge ───────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: string }) {
  const cfg = {
    starter:    { color:'var(--ink4)',   bg:'var(--surface2)' },
    growth:     { color:'var(--blue)',   bg:'var(--blue-lt)'  },
    enterprise: { color:'var(--purple)', bg:'var(--purple-lt)'},
  }[plan] || { color:'var(--ink4)', bg:'var(--surface2)' };
  return <span style={{ fontSize:10, fontWeight:700, color: cfg.color, background: cfg.bg, borderRadius:99, padding:'1px 8px', textTransform:'uppercase', letterSpacing:'.05em' }}>{plan}</span>;
}

// ─── RBAC matrix cell ─────────────────────────────────────────────────────────
function MatrixCell({ val }: { val: boolean | string }) {
  if (val === true)    return <span style={{ color:'var(--ink3)', fontSize:13 }}>✓</span>;
  if (val === 'view')  return <span title="View only" style={{ color:'var(--ink4)', fontSize:12 }}>◉</span>;
  return <span style={{ color:'var(--red)', fontSize:13, fontWeight:500 }}>✕</span>;
}

// ─── Create company modal ─────────────────────────────────────────────────────
function CreateCompanyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Record<string,string>>({
    name:'', city:'', state:'', country:'India', industry:'',
    email:'', phone:'', subscription_plan:'starter', max_employees:'100',
    admin_email:'', admin_password:'', timezone:'Asia/Kolkata',
  });
  useEffect(() => { if (open) setF(prev => ({ ...prev, name:'', city:'', email:'', admin_email:'', admin_password:'' })); }, [open]);

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setF(p => ({...p,[k]:e.target.value}));

  const mutation = useMutation({
    mutationFn: () => superSvc.create({ ...f, max_employees: Number(f.max_employees) }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['super','companies'] });
      qc.invalidateQueries({ queryKey: ['super','stats'] });
      showToast(`✓ ${r.data.name} created`);
      onClose();
    },
    onError: (e: any) => showToast(e?.message || 'Failed to create company'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Onboard New Company" subtitle="Creates company, seeds roles, departments, and admin user" width={580}
      footer={<>
        <button className="btn btn-sec" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" onClick={() => mutation.mutate()}
          disabled={!f.name || !f.admin_email || !f.admin_password || mutation.isPending}>
          {mutation.isPending ? 'Creating…' : '✓ Create Company'}
        </button>
      </>}>

      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)', marginBottom:10 }}>Company Info</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <div className="fg" style={{ gridColumn:'1/-1' }}><label>Company Name *</label><input autoFocus value={f.name} onChange={F('name')} placeholder="Nexgen Solutions Pvt Ltd" /></div>
        <div className="fg"><label>City</label><input value={f.city} onChange={F('city')} /></div>
        <div className="fg"><label>State</label><input value={f.state} onChange={F('state')} /></div>
        <div className="fg"><label>Industry</label>
          <select value={f.industry} onChange={F('industry')}>
            <option value="">— Select —</option>
            {['Technology','Finance','Healthcare','Manufacturing','Retail','Education','Real Estate','Other'].map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="fg"><label>Work Email</label><input type="email" value={f.email} onChange={F('email')} /></div>
        <div className="fg"><label>Plan</label>
          <select value={f.subscription_plan} onChange={F('subscription_plan')}>
            <option value="starter">Starter (up to 50 employees)</option>
            <option value="growth">Growth (up to 500)</option>
            <option value="enterprise">Enterprise (unlimited)</option>
          </select>
        </div>
        <div className="fg"><label>Max Employees</label><input type="number" value={f.max_employees} onChange={F('max_employees')} /></div>
      </div>

      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)', margin:'14px 0 10px' }}>Admin User (created automatically)</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <div className="fg"><label>Admin Email *</label><input type="email" value={f.admin_email} onChange={F('admin_email')} placeholder="admin@company.com" /></div>
        <div className="fg"><label>Admin Password *</label><input type="password" value={f.admin_password} onChange={F('admin_password')} placeholder="min 8 characters" /></div>
      </div>

      <div style={{ background:'var(--blue-lt)', border:'1px solid var(--blue-md)', borderRadius:'var(--r)', padding:'10px 14px', fontSize:11, color:'var(--blue)', marginTop:6 }}>
        ℹ System will automatically create: Admin, HR, Manager, Employee, Candidate roles + HR, Engineering, Finance, Operations departments.
      </div>
    </Modal>
  );
}

// ─── Company detail drawer ────────────────────────────────────────────────────
function CompanyDetail({ company, onClose }: { company: Company; onClose: () => void }) {
  const qc = useQueryClient();
  const suspendMutation  = useMutation({ mutationFn: () => superSvc.suspend(company.id),  onSuccess: () => { qc.invalidateQueries({queryKey:['super','companies']}); showToast('Company suspended'); onClose(); } });
  const activateMutation = useMutation({ mutationFn: () => superSvc.activate(company.id), onSuccess: () => { qc.invalidateQueries({queryKey:['super','companies']}); showToast('✓ Company activated'); onClose(); } });

  return (
    <div style={{ position:'fixed', right:0, top:0, bottom:0, width:440, background:'var(--surface)', borderLeft:'1px solid var(--border)', boxShadow:'var(--sh2)', zIndex:50, display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>{company.name}</div>
          <div style={{ fontSize:11, color:'var(--ink4)', marginTop:2 }}>/{company.slug} · ID #{company.id}</div>
        </div>
        <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--ink4)', lineHeight:1 }} onClick={onClose}>×</button>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>
        {/* Status + plan row */}
        <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
          <StatusBadge active={company.is_active} step={company.onboarding_step} />
          <PlanBadge plan={company.subscription_plan} />
          {company.industry && <span style={{ fontSize:11, color:'var(--ink4)' }}>{company.industry}</span>}
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
          {[
            { label:'Employees', value: company.live_employee_count },
            { label:'Users',     value: company.live_user_count },
            { label:'Max Seats', value: company.max_employees },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--r2)', padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:700, fontFamily:'var(--mono)', color:'var(--blue)' }}>{s.value}</div>
              <div style={{ fontSize:10, color:'var(--ink4)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Info rows */}
        {[
          { label:'Location',    value: [company.city, company.state].filter(Boolean).join(', ') || null },
          { label:'Country',     value: company.country },
          { label:'Email',       value: company.email },
          { label:'Phone',       value: company.phone },
          { label:'Created',     value: formatDate(company.created_at) },
          { label:'Setup',       value: company.setup_completed_at ? formatDate(company.setup_completed_at) : 'Incomplete' },
        ].map(row => row.value && (
          <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
            <span style={{ color:'var(--ink4)', fontWeight:500 }}>{row.label}</span>
            <span style={{ color:'var(--ink)' }}>{row.value}</span>
          </div>
        ))}

        {/* Roles */}
        {company.roles && company.roles.length > 0 && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--ink4)', marginBottom:8 }}>Roles</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {company.roles.map(r => (
                <span key={r.id} style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background: r.is_system?'var(--blue-lt)':'var(--surface2)', color: r.is_system?'var(--blue)':'var(--ink3)', border:`1px solid ${r.is_system?'var(--blue-md)':'var(--border)'}` }}>
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:8, flexShrink:0 }}>
        {company.is_active ? (
          <button className="btn btn-danger btn-sm" style={{ flex:1 }}
            onClick={() => { if(window.confirm(`Suspend ${company.name}?`)) suspendMutation.mutate(); }}
            disabled={suspendMutation.isPending}>
            {suspendMutation.isPending ? '…' : '⏸ Suspend Company'}
          </button>
        ) : (
          <button className="btn btn-pri btn-sm" style={{ flex:1 }}
            onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}>
            {activateMutation.isPending ? '…' : '▶ Activate Company'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const user     = useAppSelector(selectUser);

  useEffect(() => { dispatch(setPageTitle({ title: 'Settings & RBAC', breadcrumb: 'Super Admin' })); }, [dispatch]);

  // Guard — only super admin can see this page
  useEffect(() => {
    if (user && !(user as any).isSuperAdmin) router.replace('/dashboard');
  }, [user, router]);

  const [search,      setSearch]      = useState('');
  const [createOpen,  setCreateOpen]  = useState(false);
  const [selected,    setSelected]    = useState<Company | null>(null);

  const { data: statsData } = useQuery({ queryKey: ['super','stats'], queryFn: () => superSvc.stats(), staleTime: 60_000, select: (r: any) => r.data as PlatformStats });
  const { data: listData, isLoading } = useQuery({
    queryKey: ['super','companies', search],
    queryFn:  () => superSvc.list({ search: search || undefined, limit: 50 }),
    staleTime: 30_000,
    select: (r: any) => r.data as Company[],
  });

  const companies = listData || [];
  const stats = statsData;

  return (
    <AppShell>
      <div className="pg-enter">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="ph">
          <div>
            <h1>Settings & RBAC</h1>
            <p style={{ fontSize:12, color:'var(--ink4)', marginTop:2 }}>
              Multi-company · JWT / OAuth · Role-based access control · API config
            </p>
          </div>
          <div className="ph-r">
            <button className="btn btn-pri" onClick={() => setCreateOpen(true)}>+ Add Company</button>
          </div>
        </div>

        {/* ── JWT info banner ─────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--blue-lt)', border:'1px solid var(--blue-md)', borderRadius:'var(--r)', padding:'10px 14px', marginBottom:20, fontSize:12, color:'var(--blue)' }}>
          <span>🔒</span>
          <span>All access is JWT-authenticated. Role permissions enforced at API layer. Changes take effect immediately. OAuth SSO available for enterprise.</span>
        </div>

        {/* ── Platform stats ───────────────────────────────────────── */}
        {stats && (
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
            {[
              { label:'Total Companies',   value: stats.totalCompanies,     color:'var(--blue)'   },
              { label:'Active',            value: stats.activeCompanies,    color:'var(--green)'  },
              { label:'Suspended',         value: stats.suspendedCompanies, color:'var(--red)'    },
              { label:'Total Employees',   value: stats.totalEmployees,     color:'var(--purple)' },
              { label:'Total Users',       value: stats.totalUsers,         color:'var(--teal)'   },
              { label:'Starter',           value: stats.plans.starter || 0, color:'var(--ink4)'  },
              { label:'Growth',            value: stats.plans.growth || 0,  color:'var(--blue)'   },
              { label:'Enterprise',        value: stats.plans.enterprise||0,color:'var(--purple)' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r2)', padding:'10px 16px', minWidth:100 }}>
                <div style={{ fontSize:20, fontWeight:700, fontFamily:'var(--mono)', color: s.color }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--ink4)', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Two-column layout ─────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'flex-start' }}>

          {/* ── Companies & Entities ──────────────────────────── */}
          <div className="card cp">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div className="ct">Companies & Entities</div>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…" style={{ fontSize:11, padding:'5px 10px', width:140 }} />
            </div>

            {isLoading ? (
              Array.from({length:3}).map((_,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ flex:1 }}>
                    <div className="skeleton" style={{ height:14, width:'55%', marginBottom:6 }} />
                    <div className="skeleton" style={{ height:11, width:'75%' }} />
                  </div>
                  <div className="skeleton" style={{ height:22, width:52, borderRadius:99 }} />
                </div>
              ))
            ) : companies.length === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 0', color:'var(--ink4)', fontSize:12 }}>
                No companies yet.<br />
                <button className="btn btn-pri btn-sm" style={{ marginTop:10 }} onClick={() => setCreateOpen(true)}>+ Create First Company</button>
              </div>
            ) : companies.map(co => (
              <div key={co.id}
                onClick={() => setSelected(co)}
                style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'13px 0', borderBottom:'1px solid var(--border)', cursor:'pointer', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{co.name}</div>
                  <div style={{ fontSize:11, color:'var(--ink4)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {[co.city, co.state].filter(Boolean).join(' · ')}
                    {co.live_employee_count > 0 ? ` · ${co.live_employee_count} employees` : ''}
                    {co.slug ? ` · DB: ${co.slug}` : ''}
                  </div>
                </div>
                <StatusBadge active={co.is_active} step={co.onboarding_step} />
              </div>
            ))}
          </div>

          {/* ── RBAC Permissions Matrix ──────────────────────── */}
          <div className="card cp">
            <div className="ct" style={{ marginBottom:14 }}>RBAC Permissions Matrix</div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:'left', padding:'6px 0', fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--ink4)', borderBottom:'1px solid var(--border)', paddingBottom:10 }}>Module</th>
                  {['HR','ADMIN','MGR','EMP'].map(role => (
                    <th key={role} style={{ textAlign:'center', padding:'6px 8px', fontWeight:700, fontSize:10, letterSpacing:'.06em', borderBottom:'1px solid var(--border)', paddingBottom:10,
                      color: role==='HR'?'var(--blue)': role==='ADMIN'?'var(--purple)': role==='MGR'?'var(--ink3)':'var(--ink4)' }}>
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RBAC_MATRIX.map(row => (
                  <tr key={row.module} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'9px 0', fontSize:12, color:'var(--ink)', fontWeight:500 }}>{row.module}</td>
                    <td style={{ textAlign:'center', padding:'9px 8px' }}><MatrixCell val={row.HR} /></td>
                    <td style={{ textAlign:'center', padding:'9px 8px' }}><MatrixCell val={row.ADMIN} /></td>
                    <td style={{ textAlign:'center', padding:'9px 8px' }}><MatrixCell val={row.MGR} /></td>
                    <td style={{ textAlign:'center', padding:'9px 8px' }}><MatrixCell val={row.EMP} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div style={{ display:'flex', gap:14, marginTop:12, paddingTop:10, borderTop:'1px solid var(--border)', fontSize:11, color:'var(--ink4)' }}>
              <span>✓ Full</span>
              <span>◉ View-only</span>
              <span>✕ No Access</span>
              <span style={{ marginLeft:'auto' }}>Auth: JWT + OAuth</span>
            </div>

            {/* Quick nav */}
            <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--border)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--ink4)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>Permission Settings</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[
                  { label:'Roles',             href:'/settings/roles'             },
                  { label:'Permission Groups', href:'/settings/permission-groups' },
                  { label:'Permission Matrix', href:'/settings/permissions'       },
                  { label:'User Permissions',  href:'/settings/user-permissions'  },
                  { label:'Form Builder',      href:'/settings/forms'             },
                ].map(link => (
                  <button key={link.href} onClick={() => router.push(link.href)}
                    style={{ fontSize:11, padding:'5px 12px', border:'1px solid var(--border)', borderRadius:'var(--r)', cursor:'pointer', background:'var(--surface2)', color:'var(--ink3)', fontFamily:'var(--font)', transition:'all .1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--blue)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink3)'; }}>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateCompanyModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {selected && <CompanyDetail company={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}
