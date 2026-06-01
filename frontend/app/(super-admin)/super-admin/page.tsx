'use client';
import { useState }               from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient                  from '../../../services/api/client';
import { showToast }              from '../../../utils/toast';
import { Modal }                  from '../../../components/ui/Modal';
import { formatDate }             from '../../../utils/formatters';
import { useSuperAdminSwitch }    from '../../../features/auth/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id:                  number;
  name:                string;
  slug:                string | null;
  city?:               string | null;
  state?:              string | null;
  industry?:           string | null;
  email?:              string | null;
  subscription_plan:   'starter' | 'growth' | 'enterprise';
  max_employees:       number;
  is_active:           boolean;
  onboarding_step:     number;
  live_user_count:     number;
  live_employee_count: number;
  created_at:          string;
  roles?: { id: number; name: string; slug: string; is_system: boolean }[];
}

interface PlatformStats {
  totalCompanies:     number;
  activeCompanies:    number;
  suspendedCompanies: number;
  totalUsers:         number;
  totalEmployees:     number;
  plans:              Record<string, number>;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const saApi = {
  stats:    () => apiClient.get<any, any>('/super/stats'),
  list:     (p?: any) => apiClient.get<any, any>('/super/companies', { params: p }),
  create:   (d: any) => apiClient.post<any, any>('/super/companies', d),
  suspend:  (id: number) => apiClient.post<any, any>(`/super/companies/${id}/suspend`),
  activate: (id: number) => apiClient.post<any, any>(`/super/companies/${id}/activate`),
};

// ─── RBAC matrix ─────────────────────────────────────────────────────────────

const RBAC_MATRIX = [
  { module:'Payroll',       HR:true,  ADMIN:true,  MGR:'view', EMP:'view' },
  { module:'Recruitment',   HR:true,  ADMIN:true,  MGR:'view', EMP:false  },
  { module:'Leave Approve', HR:true,  ADMIN:true,  MGR:true,   EMP:false  },
  { module:'Self-Service',  HR:true,  ADMIN:true,  MGR:true,   EMP:true   },
  { module:'Audit Logs',    HR:true,  ADMIN:true,  MGR:false,  EMP:false  },
  { module:'RBAC Settings', HR:false, ADMIN:true,  MGR:false,  EMP:false  },
];

function MatrixCell({ val }: { val: boolean | string }) {
  if (val === true)   return <span style={{ color:'var(--ink3)', fontSize:14 }}>✓</span>;
  if (val === 'view') return <span style={{ color:'var(--ink4)', fontSize:13 }}>◉</span>;
  return <span style={{ color:'var(--red)', fontSize:14 }}>✕</span>;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ active, step }: { active: boolean; step: number }) {
  if (!active) return <span style={{ fontSize:11, fontWeight:600, color:'var(--red)',   background:'var(--red-lt)',   border:'1px solid var(--red-bd)',   borderRadius:99, padding:'2px 9px' }}>Suspended</span>;
  if (step < 5) return <span style={{ fontSize:11, fontWeight:600, color:'var(--amber)', background:'var(--amber-lt)', border:'1px solid var(--amber-bd)', borderRadius:99, padding:'2px 9px' }}>Setup</span>;
  return <span style={{ fontSize:11, fontWeight:600, color:'var(--green)', background:'var(--green-lt)', border:'1px solid var(--green-bd)', borderRadius:99, padding:'2px 9px' }}>Active</span>;
}

function PlanBadge({ plan }: { plan: string }) {
  const cfg = { starter:{bg:'var(--surface2)',color:'var(--ink4)'}, growth:{bg:'var(--blue-lt)',color:'var(--blue)'}, enterprise:{bg:'var(--purple-lt)',color:'var(--purple)'} }[plan] || {bg:'var(--surface2)',color:'var(--ink4)'};
  return <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:99, background:cfg.bg, color:cfg.color, textTransform:'uppercase', letterSpacing:'.05em' }}>{plan}</span>;
}

// ─── Create company modal ─────────────────────────────────────────────────────

function CreateCompanyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name:'', city:'', state:'', industry:'', email:'', subscription_plan:'starter', max_employees:'100', admin_email:'', admin_password:'' });
  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({...p,[k]:e.target.value}));

  const mutation = useMutation({
    mutationFn: () => saApi.create({ ...f, max_employees: Number(f.max_employees) }),
    onSuccess: (r: any) => { qc.invalidateQueries({ queryKey: ['sa'] }); showToast(`✓ ${r.data.name} created`); onClose(); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Onboard New Company" subtitle="Creates company · roles · departments · admin user in one step" width={580}
      footer={<>
        <button className="btn btn-sec" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" onClick={() => mutation.mutate()} disabled={!f.name || !f.admin_email || !f.admin_password || mutation.isPending}>
          {mutation.isPending ? 'Creating…' : '✓ Create Company'}
        </button>
      </>}>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)', marginBottom:10 }}>Company Info</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <div className="fg" style={{ gridColumn:'1/-1' }}><label>Company Name *</label><input autoFocus value={f.name} onChange={F('name')} placeholder="Nexgen Solutions Pvt Ltd" /></div>
        <div className="fg"><label>City</label><input value={f.city} onChange={F('city')} /></div>
        <div className="fg"><label>State</label><input value={f.state} onChange={F('state')} /></div>
        <div className="fg"><label>Industry</label>
          <select value={f.industry} onChange={F('industry')}>
            <option value="">— Select —</option>
            {['Technology','Finance','Healthcare','Manufacturing','Retail','Education','Other'].map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="fg"><label>Work Email</label><input type="email" value={f.email} onChange={F('email')} /></div>
        <div className="fg"><label>Plan</label>
          <select value={f.subscription_plan} onChange={F('subscription_plan')}>
            <option value="starter">Starter (up to 50)</option>
            <option value="growth">Growth (up to 500)</option>
            <option value="enterprise">Enterprise (unlimited)</option>
          </select>
        </div>
        <div className="fg"><label>Max Employees</label><input type="number" value={f.max_employees} onChange={F('max_employees')} /></div>
      </div>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)', margin:'14px 0 10px' }}>Company Admin User</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <div className="fg"><label>Admin Email *</label><input type="email" value={f.admin_email} onChange={F('admin_email')} placeholder="admin@company.com" /></div>
        <div className="fg"><label>Admin Password *</label><input type="password" value={f.admin_password} onChange={F('admin_password')} placeholder="min 8 characters" /></div>
      </div>
      <div style={{ background:'var(--blue-lt)', border:'1px solid var(--blue-md)', borderRadius:'var(--r)', padding:'10px 14px', fontSize:11, color:'var(--blue)', marginTop:6 }}>
        ℹ Auto-creates: Admin / HR / Manager / Employee / Candidate roles + HR / Engineering / Finance / Operations departments
      </div>
    </Modal>
  );
}

// ─── Company detail drawer with Switch button ─────────────────────────────────

function CompanyDrawer({ company, onClose }: { company: Company; onClose: () => void }) {
  const qc = useQueryClient();
  const { switchToCompany, exitCompany, isSwitching } = useSuperAdminSwitch();

  const suspendMutation  = useMutation({ mutationFn: () => saApi.suspend(company.id),  onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa'] }); showToast('Company suspended'); onClose(); } });
  const activateMutation = useMutation({ mutationFn: () => saApi.activate(company.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa'] }); showToast('✓ Company activated'); onClose(); } });

  return (
    <div style={{ position:'fixed', right:0, top:0, bottom:0, width:440, background:'var(--surface)', borderLeft:'1px solid var(--border)', boxShadow:'0 0 40px rgba(0,0,0,.15)', zIndex:50, display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>{company.name}</div>
          <div style={{ fontSize:11, color:'var(--ink4)', marginTop:2 }}>/{company.slug} · ID #{company.id}</div>
        </div>
        <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--ink4)', lineHeight:1 }} onClick={onClose}>×</button>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          <StatusBadge active={company.is_active} step={company.onboarding_step} />
          <PlanBadge plan={company.subscription_plan} />
          {company.industry && <span style={{ fontSize:11, color:'var(--ink4)' }}>{company.industry}</span>}
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
          {[{label:'Employees',value:company.live_employee_count},{label:'Users',value:company.live_user_count},{label:'Max Seats',value:company.max_employees}].map(s => (
            <div key={s.label} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--r2)', padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:700, fontFamily:'var(--mono)', color:'var(--blue)' }}>{s.value}</div>
              <div style={{ fontSize:10, color:'var(--ink4)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Info rows */}
        {[
          { label:'Location', value:[company.city,company.state].filter(Boolean).join(', ')||null },
          { label:'Email',    value:company.email },
          { label:'Created',  value:formatDate(company.created_at) },
        ].filter(r=>r.value).map(r => (
          <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
            <span style={{ color:'var(--ink4)', fontWeight:500 }}>{r.label}</span>
            <span style={{ color:'var(--ink)' }}>{r.value}</span>
          </div>
        ))}

        {/* Roles */}
        {company.roles && company.roles.length > 0 && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--ink4)', marginBottom:8 }}>Roles</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {company.roles.map(r => (
                <span key={r.id} style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:r.is_system?'var(--blue-lt)':'var(--surface2)', color:r.is_system?'var(--blue)':'var(--ink3)', border:`1px solid ${r.is_system?'var(--blue-md)':'var(--border)'}` }}>{r.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Switch to Company (Option B) ──────────────────────────────── */}
        {company.is_active && (
          <div style={{ marginTop:20, background:'var(--purple-lt)', border:'1px solid var(--purple-bd)', borderRadius:'var(--r2)', padding:'14px 16px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--purple)', marginBottom:6, display:'flex', alignItems:'center', gap:7 }}>
              <span>👁</span> View as this Company
            </div>
            <div style={{ fontSize:11, color:'var(--ink4)', lineHeight:1.6, marginBottom:12 }}>
              Switch into <strong>{company.name}</strong>'s context. You'll see their HR data, employees, payroll, and settings exactly as their admin does. A banner will remind you that you're in company view.
            </div>
            <button
              className="btn btn-pri btn-sm"
              style={{ background:'var(--purple)', borderColor:'var(--purple)', width:'100%', justifyContent:'center' }}
              onClick={() => { switchToCompany(company.id); onClose(); }}
              disabled={isSwitching}
            >
              {isSwitching ? 'Switching…' : `👁 Switch to ${company.name}`}
            </button>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:8, flexShrink:0 }}>
        {company.is_active ? (
          <button className="btn btn-danger" style={{ flex:1 }} onClick={() => { if(window.confirm(`Suspend ${company.name}?`)) suspendMutation.mutate(); }} disabled={suspendMutation.isPending}>
            {suspendMutation.isPending ? '…' : '⏸ Suspend'}
          </button>
        ) : (
          <button className="btn btn-pri" style={{ flex:1 }} onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}>
            {activateMutation.isPending ? '…' : '▶ Activate'}
          </button>
        )}
        <button className="btn btn-sec" style={{ flex:1 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [search,     setSearch]     = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected,   setSelected]   = useState<Company | null>(null);

  const { data: stats }        = useQuery({ queryKey:['sa','stats'],          queryFn:() => saApi.stats(), staleTime:60_000, select:(r:any)=>r.data as PlatformStats });
  const { data: companies = [], isLoading } = useQuery({ queryKey:['sa','companies',search], queryFn:()=>saApi.list({ search:search||undefined, limit:50 }), staleTime:30_000, select:(r:any)=>r.data as Company[] });

  return (
    <div>
      {/* Page header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--ink)', margin:0 }}>Platform Overview</h1>
          <p style={{ fontSize:12, color:'var(--ink4)', marginTop:4 }}>Multi-company · JWT / OAuth · Role-based access control · API config</p>
        </div>
        <button className="btn btn-pri" onClick={() => setCreateOpen(true)}>+ Add Company</button>
      </div>

      {/* Info banner */}
      <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--blue-lt)', border:'1px solid var(--blue-md)', borderRadius:'var(--r)', padding:'10px 14px', marginBottom:20, fontSize:12, color:'var(--blue)' }}>
        🔒 All access is JWT-authenticated. Role permissions enforced at API layer. Changes take effect immediately.
      </div>

      {/* Platform stats */}
      {stats && (
        <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { label:'Total Companies',  value:stats.totalCompanies,      color:'var(--blue)'   },
            { label:'Active',           value:stats.activeCompanies,     color:'var(--green)'  },
            { label:'Suspended',        value:stats.suspendedCompanies,  color:'var(--red)'    },
            { label:'Total Employees',  value:stats.totalEmployees,      color:'var(--purple)' },
            { label:'Total Users',      value:stats.totalUsers,          color:'var(--teal)'   },
            { label:'Starter',          value:stats.plans?.starter  || 0,color:'var(--ink4)'  },
            { label:'Growth',           value:stats.plans?.growth   || 0,color:'var(--blue)'  },
            { label:'Enterprise',       value:stats.plans?.enterprise||0,color:'var(--purple)' },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r2)', padding:'12px 16px', minWidth:90, boxShadow:'var(--sh)' }}>
              <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--mono)', color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10, color:'var(--ink4)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Two columns */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'flex-start' }}>

        {/* Companies list */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r3)', overflow:'hidden', boxShadow:'var(--sh)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>Companies & Entities</div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{ fontSize:11, padding:'5px 10px', width:130, border:'1px solid var(--border)', borderRadius:'var(--r)', outline:'none', background:'var(--surface2)', color:'var(--ink)', fontFamily:'var(--font)' }} />
          </div>
          <div>
            {isLoading
              ? Array.from({length:3}).map((_,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
                    <div className="skeleton" style={{ height:14, width:'55%', borderRadius:4 }} />
                    <div className="skeleton" style={{ height:22, width:52, borderRadius:99 }} />
                  </div>
                ))
              : companies.length === 0
              ? <div style={{ textAlign:'center', padding:'30px', color:'var(--ink4)', fontSize:12 }}>
                  No companies yet.
                  <button className="btn btn-pri btn-sm" style={{ marginLeft:10 }} onClick={() => setCreateOpen(true)}>+ Create First</button>
                </div>
              : companies.map(co => (
                  <div key={co.id} onClick={() => setSelected(co)}
                    style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'12px 18px', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{co.name}</div>
                      <div style={{ fontSize:11, color:'var(--ink4)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {[co.city,co.state].filter(Boolean).join(' · ')}
                        {co.live_employee_count > 0 ? ` · ${co.live_employee_count} employees` : ''}
                        {co.slug ? ` · ${co.slug}` : ''}
                      </div>
                    </div>
                    <StatusBadge active={co.is_active} step={co.onboarding_step} />
                  </div>
                ))
            }
          </div>
        </div>

        {/* RBAC matrix */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r3)', overflow:'hidden', boxShadow:'var(--sh)' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize:13, fontWeight:700, color:'var(--ink)' }}>RBAC Permissions Matrix</div>
          <div style={{ padding:'4px 18px 16px' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:'left', padding:'8px 0', fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--ink4)', borderBottom:'1px solid var(--border)', paddingBottom:10 }}>Module</th>
                  {['HR','ADMIN','MGR','EMP'].map(r => (
                    <th key={r} style={{ textAlign:'center', padding:'8px', fontWeight:700, fontSize:10, letterSpacing:'.06em', borderBottom:'1px solid var(--border)', paddingBottom:10, color:r==='HR'?'var(--blue)':r==='ADMIN'?'var(--purple)':r==='MGR'?'var(--ink3)':'var(--ink4)' }}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RBAC_MATRIX.map(row => (
                  <tr key={row.module} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'9px 0', fontWeight:500, color:'var(--ink)' }}>{row.module}</td>
                    <td style={{ textAlign:'center', padding:'9px 8px' }}><MatrixCell val={row.HR} /></td>
                    <td style={{ textAlign:'center', padding:'9px 8px' }}><MatrixCell val={row.ADMIN} /></td>
                    <td style={{ textAlign:'center', padding:'9px 8px' }}><MatrixCell val={row.MGR} /></td>
                    <td style={{ textAlign:'center', padding:'9px 8px' }}><MatrixCell val={row.EMP} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:'flex', gap:16, marginTop:12, paddingTop:10, borderTop:'1px solid var(--border)', fontSize:11, color:'var(--ink4)' }}>
              <span>✓ Full</span><span>◉ View-only</span><span>✕ No Access</span>
              <span style={{ marginLeft:'auto' }}>Auth: JWT + OAuth</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateCompanyModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {selected && <CompanyDrawer company={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
