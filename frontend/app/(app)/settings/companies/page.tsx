'use client';
import { useEffect, useState } from 'react';
import { useAppDispatch }      from '../../../../store';
import { setPageTitle }        from '../../../../store/slices/uiSlice';
import { AppShell }            from '../../../../layouts/AppLayout';
import { Modal }               from '../../../../components/ui/Modal';
import { usePermission }       from '../../../../features/auth/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient               from '../../../../services/api/client';
import { showToast }           from '../../../../utils/toast';
import { formatDate }          from '../../../../utils/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id:                  number;
  name:                string;
  slug:                string | null;
  city?:               string | null;
  state?:              string | null;
  industry?:           string | null;
  email?:              string | null;
  max_employees:       number;
  is_active:           boolean;
  onboarding_step:     number;
  live_user_count:     number;
  live_employee_count: number;
  created_at:          string;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ c }: { c: Company }) {
  if (!c.is_active)    return <span style={{ fontSize:11, fontWeight:600, color:'var(--red)',   background:'var(--red-lt)',   border:'1px solid var(--red-bd)',   borderRadius:99, padding:'2px 9px', whiteSpace:'nowrap' }}>Suspended</span>;
  if (c.onboarding_step < 5) return <span style={{ fontSize:11, fontWeight:600, color:'var(--amber)', background:'var(--amber-lt)', border:'1px solid var(--amber-bd)', borderRadius:99, padding:'2px 9px', whiteSpace:'nowrap' }}>Setup</span>;
  return <span style={{ fontSize:11, fontWeight:600, color:'var(--green)', background:'var(--green-lt)', border:'1px solid var(--green-bd)', borderRadius:99, padding:'2px 9px', whiteSpace:'nowrap' }}>Active</span>;
}

function PlanBadge({ plan }: { plan: string }) {
  const cfg: Record<string,{bg:string;c:string}> = {
    starter:    { bg:'var(--surface2)',  c:'var(--ink4)'   },
    growth:     { bg:'var(--blue-lt)',   c:'var(--blue)'   },
    enterprise: { bg:'var(--purple-lt)', c:'var(--purple)' },
  };
  const { bg, c } = cfg[plan] || cfg.starter;
  return <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:99, background:bg, color:c, textTransform:'uppercase', letterSpacing:'.05em' }}>{plan}</span>;
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name:'', city:'', state:'', industry:'', email:'', max_employees:'100', admin_email:'', admin_password:'' });
  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setF(p => ({...p,[k]:e.target.value}));

  const mutation = useMutation({
    mutationFn: () => apiClient.post<any,any>('/admin/companies', { ...f, max_employees: Number(f.max_employees) }),
    onSuccess: (r: any) => { qc.invalidateQueries({ queryKey:['admin-companies'] }); showToast(`✓ ${r.data.name} created`); onClose(); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Onboard New Company" subtitle="Creates company, roles, departments and admin user in one step" width={580}
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
        <div className="fg"><label>Max Employees</label><input type="number" value={f.max_employees} onChange={F('max_employees')} /></div>
      </div>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)', margin:'14px 0 10px' }}>Admin User</div>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const dispatch = useAppDispatch();
  const { canView, canCreate, canEdit, hasPermission } = usePermission();
  useEffect(() => { dispatch(setPageTitle({ title: 'Companies', breadcrumb: 'Settings' })); }, [dispatch]);

  const [search,      setSearch]      = useState('');
  const [createOpen,  setCreateOpen]  = useState(false);
  const [selected,    setSelected]    = useState<Company | null>(null);

  const { data: listData, isLoading } = useQuery({
    queryKey: ['admin-companies', search],
    queryFn:  () => apiClient.get<any,any>('/admin/companies', { params: { search: search||undefined, limit: 50 } }),
    select:   (r: any) => r.data as Company[],
    enabled:  canView('companies'),
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin-platform-stats'],
    queryFn:  () => apiClient.get<any,any>('/admin/platform-stats'),
    select:   (r: any) => r.data,
    enabled:  hasPermission('super_admin:access'),
  });

  const qc = useQueryClient();
  const suspendMutation  = useMutation({ mutationFn: (id:number) => apiClient.post<any,any>(`/admin/companies/${id}/suspend`),  onSuccess: () => { qc.invalidateQueries({queryKey:['admin-companies']}); showToast('Company suspended'); setSelected(null); } });
  const activateMutation = useMutation({ mutationFn: (id:number) => apiClient.post<any,any>(`/admin/companies/${id}/activate`), onSuccess: () => { qc.invalidateQueries({queryKey:['admin-companies']}); showToast('✓ Company activated'); setSelected(null); } });

  const companies = listData || [];

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Companies</h1>
            <p>Manage tenant companies, subscription plans, and onboard new clients.</p>
          </div>
          <div className="ph-r">
            {canCreate('companies') && (
              <button className="btn btn-pri" onClick={() => setCreateOpen(true)}>+ Add Company</button>
            )}
          </div>
        </div>

        {/* Platform stats */}
        {statsData && (
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
            {[
              { label:'Total Companies', value: statsData.totalCompanies,     color:'var(--blue)'   },
              { label:'Active',          value: statsData.activeCompanies,    color:'var(--green)'  },
              { label:'Suspended',       value: statsData.suspendedCompanies, color:'var(--red)'    },
              { label:'Total Employees', value: statsData.totalEmployees,     color:'var(--purple)' },
              { label:'Users',           value: statsData.totalUsers,         color:'var(--teal)'   },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r2)', padding:'12px 16px', minWidth:110, boxShadow:'var(--sh)' }}>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--mono)', color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--ink4)', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom:14 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies…"
            style={{ width:280, fontSize:12 }} />
        </div>

        {/* Table */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r3)', overflow:'hidden', boxShadow:'var(--sh)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'var(--surface2)' }}>
                {['Company','Location','Plan','Employees','Status','Created','Actions'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)', borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({length:4}).map((_,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                      {Array.from({length:7}).map((_,j) => (
                        <td key={j} style={{ padding:'12px 14px' }}><div className="skeleton" style={{ height:13, width: j===0?'70%':'40%', borderRadius:4 }} /></td>
                      ))}
                    </tr>
                  ))
                : companies.map(co => (
                    <tr key={co.id} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ fontWeight:600, color:'var(--ink)' }}>{co.name}</div>
                        <div style={{ fontSize:10, color:'var(--ink4)', marginTop:2 }}>{co.slug || '—'}</div>
                      </td>
                      <td style={{ padding:'12px 14px', color:'var(--ink3)' }}>{[co.city,co.state].filter(Boolean).join(', ') || '—'}</td>
                      <td style={{ padding:'12px 14px', fontFamily:'var(--mono)', color:'var(--ink2)', textAlign:'center' }}>{co.live_employee_count} / {co.max_employees}</td>
                      <td style={{ padding:'12px 14px' }}><StatusBadge c={co} /></td>
                      <td style={{ padding:'12px 14px', color:'var(--ink4)' }}>{formatDate(co.created_at)}</td>
                      <td style={{ padding:'12px 14px' }}>
                        {canEdit('companies') && (
                          <div style={{ display:'flex', gap:6 }}>
                            {co.is_active
                              ? <button className="btn btn-sec btn-sm" style={{ fontSize:11, color:'var(--red)' }} onClick={() => { if(window.confirm(`Suspend ${co.name}?`)) suspendMutation.mutate(co.id); }}>⏸</button>
                              : <button className="btn btn-sec btn-sm" style={{ fontSize:11, color:'var(--green)' }} onClick={() => activateMutation.mutate(co.id)}>▶</button>
                            }
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
          {!isLoading && companies.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--ink4)' }}>
              <div style={{ fontSize:28, marginBottom:10 }}>🏢</div>
              <div style={{ fontSize:14, fontWeight:600 }}>No companies yet</div>
              {canCreate('companies') && <button className="btn btn-pri btn-sm" style={{ marginTop:12 }} onClick={() => setCreateOpen(true)}>+ Add First Company</button>}
            </div>
          )}
        </div>
      </div>

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}
