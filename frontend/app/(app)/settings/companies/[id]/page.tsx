'use client';
import { useEffect, useState }   from 'react';
import { useParams, useRouter }  from 'next/navigation';
import { useAppDispatch }        from '../../../../../store';
import { setPageTitle }          from '../../../../../store/slices/uiSlice';
import { AppShell }              from '../../../../../layouts/AppLayout';
import { Modal }                 from '../../../../../components/ui/Modal';
import { usePermission }         from '../../../../../hooks/usePermission';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient                 from '../../../../../services/api/client';
import { showToast }             from '../../../../../utils/toast';
import { formatDate }            from '../../../../../utils/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Manager {
  employee: {
    id:            number;
    first_name:    string;
    last_name:     string;
    email:         string;
    employee_code: string;
    avatar_url?:   string | null;
    is_super_admin: boolean;
  };
  role:        'owner' | 'admin' | 'manager';
  is_primary:  boolean;
  assigned_at: string;
}

interface CompanyDetail {
  id:               number;
  name:             string;
  slug:             string;
  email?:           string;
  phone?:           string;
  city?:            string;
  state?:           string;
  country?:         string;
  industry?:        string;
  gstin?:           string;
  subscription_plan: string;
  max_employees:    number;
  employee_count:   number;
  is_active:        boolean;
  onboarding_step:  number;
  managers:         Manager[];
  roles:            { id:number; name:string; slug:string }[];
}

interface EligibleEmployee {
  id:            number;
  full_name:     string;
  email:         string;
  employee_code: string;
  is_super_admin: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Av({ name, size=36 }: { name:string; size?:number }) {
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'linear-gradient(135deg,var(--blue),var(--purple))',
      color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*.32, fontWeight:700, flexShrink:0 }}>
      {initials}
    </div>
  );
}

const ROLE_META = {
  owner:   { label:'Owner',   color:'var(--purple)', bg:'var(--purple-lt)', desc:'Full control — can edit company, assign managers, manage employees' },
  admin:   { label:'Admin',   color:'var(--blue)',   bg:'var(--blue-lt)',   desc:'Can create and manage employees' },
  manager: { label:'Manager', color:'var(--ink3)',   bg:'var(--surface2)',  desc:'View only access' },
};

// ─── Assign Manager Modal ─────────────────────────────────────────────────────

function AssignManagerModal({ companyId, onClose }: { companyId:number; onClose:()=>void }) {
  const qc = useQueryClient();
  const [search,    setSearch]    = useState('');
  const [selEmp,    setSelEmp]    = useState<EligibleEmployee|null>(null);
  const [role,      setRole]      = useState<'admin'|'manager'>('admin');
  const [isPrimary, setIsPrimary] = useState(false);

  const { data: eligible = [] } = useQuery({
    queryKey: ['eligible', companyId],
    queryFn:  () => apiClient.get<any,any>(`/companies/${companyId}/eligible-managers`),
    select:   (r:any) => r.data as EligibleEmployee[],
  });

  const filtered = eligible.filter(e =>
    !search ||
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: () => apiClient.post<any,any>(`/companies/${companyId}/managers`, {
      employee_id: selEmp!.id, role, is_primary: isPrimary,
    }),
    onSuccess: (r:any) => {
      qc.invalidateQueries({ queryKey: ['company', companyId] });
      showToast(`✓ ${r.data.message}`);
      onClose();
    },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });

  return (
    <Modal open={true} onClose={onClose} title="Assign Manager" subtitle="Select an employee to manage this company" width={480}
      footer={<>
        <button className="btn btn-sec" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" onClick={() => mutation.mutate()} disabled={!selEmp || mutation.isPending}>
          {mutation.isPending ? 'Assigning…' : '✓ Assign Manager'}
        </button>
      </>}>

      {/* Search */}
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'7px 10px', marginBottom:10 }}>
        <span style={{ color:'var(--ink4)' }}>⌕</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} autoFocus placeholder="Search employees…"
          style={{ border:'none', background:'transparent', outline:'none', fontSize:12, fontFamily:'var(--font)', flex:1, color:'var(--ink)' }} />
      </div>

      {/* Employee list */}
      <div style={{ border:'1px solid var(--border)', borderRadius:'var(--r2)', overflow:'hidden', maxHeight:240, overflowY:'auto', marginBottom:14 }}>
        {filtered.length === 0 ? (
          <div style={{ padding:20, textAlign:'center', color:'var(--ink4)', fontSize:12 }}>
            No eligible employees found.<br/>Must have <code>companies:manage</code> permission or super admin status.
          </div>
        ) : filtered.map(emp => (
          <div key={emp.id} onClick={() => setSelEmp(emp)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', cursor:'pointer',
              borderBottom:'1px solid var(--border)',
              background: selEmp?.id===emp.id ? 'var(--blue-lt)' : 'transparent' }}>
            <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${selEmp?.id===emp.id?'var(--blue)':'var(--border2)'}`,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .1s' }}>
              {selEmp?.id===emp.id && <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--blue)' }} />}
            </div>
            <Av name={emp.full_name} size={30} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', display:'flex', alignItems:'center', gap:6 }}>
                {emp.full_name}
                {emp.is_super_admin && (
                  <span style={{ fontSize:9, background:'var(--purple-lt)', color:'var(--purple)', border:'1px solid var(--purple-bd)', borderRadius:3, padding:'1px 5px', fontWeight:700 }}>⚡ SA</span>
                )}
              </div>
              <div style={{ fontSize:10, color:'var(--ink4)' }}>{emp.employee_code} · {emp.email}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Role selection */}
      <div className="fg" style={{ marginBottom:10 }}>
        <label>Manager Role</label>
        <select value={role} onChange={e=>setRole(e.target.value as any)}
          style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border2)', borderRadius:'var(--r)', fontSize:12, fontFamily:'var(--font)', background:'var(--surface)', color:'var(--ink)' }}>
          <option value="admin">Admin — can create and manage employees</option>
          <option value="manager">Manager — view only</option>
        </select>
      </div>

      <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, cursor:'pointer' }}>
        <input type="checkbox" checked={isPrimary} onChange={e=>setIsPrimary(e.target.checked)}
          style={{ width:14, height:14, accentColor:'var(--blue)' }} />
        Set as primary contact for this company
      </label>
    </Modal>
  );
}

// ─── Main detail page ─────────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const { id }    = useParams();
  const companyId = Number(id);
  const dispatch  = useAppDispatch();
  const router    = useRouter();
  const qc        = useQueryClient();
  const { canEdit, isSuperAdmin } = usePermission();

  const [tab,        setTab]        = useState<'overview'|'managers'|'settings'>('overview');
  const [assignOpen, setAssignOpen] = useState(false);
  const [editMode,   setEditMode]   = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn:  () => apiClient.get<any,any>(`/companies/${companyId}`),
    select:   (r:any) => r.data as CompanyDetail,
  });

  useEffect(() => {
    if (company) dispatch(setPageTitle({ title: company.name, breadcrumb: 'Companies' }));
  }, [company, dispatch]);

  const removeMgr = useMutation({
    mutationFn: (empId:number) => apiClient.delete<any,any>(`/companies/${companyId}/managers/${empId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['company', companyId] }); showToast('Manager removed'); },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });

  const makePrimary = useMutation({
    mutationFn: (empId:number) => apiClient.put<any,any>(`/companies/${companyId}/managers/${empId}`, { is_primary: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['company', companyId] }); showToast('✓ Primary manager updated'); },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });

  if (isLoading) return <AppShell><div style={{ padding:40, textAlign:'center', color:'var(--ink4)' }}>Loading…</div></AppShell>;
  if (!company)  return <AppShell><div style={{ padding:40, textAlign:'center', color:'var(--ink4)' }}>Company not found</div></AppShell>;

  const tabs = [
    { id:'overview' as const, label:'Overview'  },
    { id:'managers' as const, label:`Managers (${company.managers?.length || 0})` },
    { id:'settings' as const, label:'Settings'  },
  ];

  return (
    <AppShell>
      <div className="pg-enter">

        {/* Header */}
        <div className="ph" style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={() => router.push('/settings/companies')}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink4)', fontSize:14, padding:4 }}>
              ←
            </button>
            <div style={{ width:44, height:44, borderRadius:'var(--r2)', background:'linear-gradient(135deg,var(--blue),var(--purple))',
              display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:18, fontWeight:700 }}>
              {company.name[0].toUpperCase()}
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <h1 style={{ fontSize:20 }}>{company.name}</h1>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                  background: company.is_active ? 'var(--green-lt)' : 'var(--red-lt)',
                  color: company.is_active ? 'var(--green)' : 'var(--red)',
                  border: `1px solid ${company.is_active ? 'var(--green-bd)' : 'var(--red-bd)'}` }}>
                  {company.is_active ? 'Active' : 'Suspended'}
                </span>
              </div>
              <div style={{ fontSize:12, color:'var(--ink4)', marginTop:2 }}>
                /{company.slug} · {company.subscription_plan} · {company.employee_count}/{company.max_employees} employees
                {company.city ? ` · ${company.city}${company.state ? `, ${company.state}` : ''}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', borderBottom:'2px solid var(--border)', marginBottom:24 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'10px 20px', border:'none', background:'transparent', cursor:'pointer',
                fontFamily:'var(--font)', fontSize:13, fontWeight: tab===t.id ? 600 : 400,
                color: tab===t.id ? 'var(--blue)' : 'var(--ink4)',
                borderBottom: tab===t.id ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom:-2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ──────────────────────────────────── */}
        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Info card */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r3)', padding:20, boxShadow:'var(--sh)' }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', marginBottom:14 }}>Company Info</div>
              {[
                { label:'Industry',  value: company.industry || '—' },
                { label:'Email',     value: company.email    || '—' },
                { label:'Phone',     value: company.phone    || '—' },
                { label:'GSTIN',     value: company.gstin    || '—' },
                { label:'Plan',      value: company.subscription_plan },
                { label:'Currency',  value: 'INR' },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                  <span style={{ color:'var(--ink4)' }}>{r.label}</span>
                  <span style={{ fontWeight:500, color:'var(--ink)' }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Capacity card */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r3)', padding:20, boxShadow:'var(--sh)' }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', marginBottom:14 }}>Capacity</div>
              <div style={{ fontSize:32, fontWeight:500, color:'var(--ink)', marginBottom:4 }}>
                {company.employee_count}<span style={{ fontSize:14, color:'var(--ink4)', fontWeight:400 }}> / {company.max_employees}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--ink4)', marginBottom:10 }}>Employees</div>
              <div style={{ height:8, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, width:`${Math.min(100, company.employee_count/company.max_employees*100)}%`,
                  background: company.employee_count > company.max_employees * 0.9 ? 'var(--amber)' : 'var(--blue)',
                  transition:'width .3s' }} />
              </div>
              <div style={{ marginTop:16, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', marginBottom:10 }}>Roles</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {company.roles?.map(r => (
                  <span key={r.id} style={{ fontSize:10, padding:'3px 8px', borderRadius:99, background:'var(--surface2)', color:'var(--ink3)', border:'1px solid var(--border)' }}>
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Managers tab ──────────────────────────────────── */}
        {tab === 'managers' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Company Managers</div>
                <div style={{ fontSize:12, color:'var(--ink4)', marginTop:2 }}>
                  Employees who have access to manage this company
                </div>
              </div>
              {canEdit('companies') && (
                <button className="btn btn-pri btn-sm" onClick={() => setAssignOpen(true)}>+ Assign Manager</button>
              )}
            </div>

            {/* Role legend */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
              {Object.entries(ROLE_META).map(([role, meta]) => (
                <div key={role} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:99,
                  background:meta.bg, border:`1px solid ${meta.color}22` }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:meta.color, flexShrink:0 }} />
                  <span style={{ fontSize:11, fontWeight:600, color:meta.color }}>{meta.label}</span>
                  <span style={{ fontSize:10, color:'var(--ink4)' }}>— {meta.desc}</span>
                </div>
              ))}
            </div>

            {/* Manager cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(company.managers || []).length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:'var(--ink4)', background:'var(--surface)', border:'2px dashed var(--border)', borderRadius:'var(--r3)', fontSize:12 }}>
                  No managers assigned yet. Assign managers to give them access to this company.
                </div>
              ) : (company.managers || []).map(m => {
                const meta   = ROLE_META[m.role];
                const isOwner = m.role === 'owner';
                return (
                  <div key={m.employee.id} style={{ background:'var(--surface)', border:`1px solid var(--border)`, borderLeft:`3px solid ${meta.color}`,
                    borderRadius:'var(--r3)', padding:'14px 18px', display:'flex', alignItems:'center', gap:14, boxShadow:'var(--sh)' }}>
                    <Av name={`${m.employee.first_name} ${m.employee.last_name}`} size={42} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>
                          {m.employee.first_name} {m.employee.last_name}
                        </span>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                          background:meta.bg, color:meta.color, border:`1px solid ${meta.color}44` }}>
                          {meta.label}
                        </span>
                        {m.is_primary && (
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                            background:'var(--amber-lt)', color:'var(--amber)', border:'1px solid var(--amber-bd)' }}>
                            ★ Primary
                          </span>
                        )}
                        {m.employee.is_super_admin && (
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                            background:'var(--purple-lt)', color:'var(--purple)', border:'1px solid var(--purple-bd)' }}>
                            ⚡ Super Admin
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:11, color:'var(--ink4)', marginTop:3 }}>
                        {m.employee.employee_code} · {m.employee.email} · Assigned {formatDate(m.assigned_at)}
                      </div>
                    </div>
                    {canEdit('companies') && !isOwner && (
                      <div style={{ display:'flex', gap:'6px', flexShrink:'0px' }}>
                        {!m.is_primary && (
                          <button className="btn btn-sec btn-sm" style={{ fontSize:11 }}
                            onClick={() => makePrimary.mutate(m.employee.id)}>
                            ★ Make Primary
                          </button>
                        )}
                        <button className="btn btn-sec btn-sm" style={{ fontSize:11, color:'var(--red)' }}
                          onClick={() => { if(window.confirm(`Remove ${m.employee.first_name} from this company?`)) removeMgr.mutate(m.employee.id); }}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Settings tab ──────────────────────────────────── */}
        {tab === 'settings' && (
          <div style={{ maxWidth:520 }}>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r3)', padding:20, boxShadow:'var(--sh)', marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', marginBottom:16 }}>Edit Company Details</div>
              <CompanyEditForm company={company} companyId={companyId} />
            </div>
            {canEdit('companies') && (
              <div style={{ background:'var(--red-lt)', border:'1px solid var(--red-bd)', borderRadius:'var(--r3)', padding:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--red)', marginBottom:6 }}>Danger Zone</div>
                <div style={{ fontSize:12, color:'var(--ink3)', marginBottom:12 }}>
                  Suspending a company prevents all employees from logging in. The data is preserved.
                </div>
                {company.is_active ? (
                  <button className="btn btn-sec btn-sm" style={{ fontSize:11, color:'var(--red)', borderColor:'var(--red-bd)' }}
                    onClick={() => { if(window.confirm(`Suspend ${company.name}? All employees will lose access.`)) {
                      apiClient.post<any,any>(`/companies/${companyId}/suspend`).then(() => { qc.invalidateQueries({ queryKey:['company',companyId] }); showToast('Company suspended'); });
                    }}}>
                    ⏸ Suspend Company
                  </button>
                ) : (
                  <button className="btn btn-sec btn-sm" style={{ fontSize:11, color:'var(--green)', borderColor:'var(--green-bd)' }}
                    onClick={() => apiClient.post<any,any>(`/companies/${companyId}/activate`).then(() => { qc.invalidateQueries({ queryKey:['company',companyId] }); showToast('✓ Company activated'); })}>
                    ▶ Activate Company
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {assignOpen && <AssignManagerModal companyId={companyId} onClose={() => setAssignOpen(false)} />}
    </AppShell>
  );
}

// ─── Inline edit form ─────────────────────────────────────────────────────────

function CompanyEditForm({ company, companyId }: { company:CompanyDetail; companyId:number }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name:       company.name,
    email:      company.email      || '',
    phone:      company.phone      || '',
    city:       company.city       || '',
    state:      company.state      || '',
    country:    company.country    || 'India',
    industry:   company.industry   || '',
    gstin:      company.gstin      || '',
    max_employees: String(company.max_employees),
    subscription_plan: company.subscription_plan,
  });
  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setF(p => ({...p,[k]:e.target.value}));

  const mut = useMutation({
    mutationFn: () => apiClient.put<any,any>(`/companies/${companyId}`, { ...f, max_employees: Number(f.max_employees) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['company',companyId] }); showToast('✓ Company updated'); },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
      <div className="fg" style={{ gridColumn:'1/-1' }}><label>Company Name</label><input value={f.name} onChange={F('name')} /></div>
      <div className="fg"><label>Email</label><input type="email" value={f.email} onChange={F('email')} /></div>
      <div className="fg"><label>Phone</label><input value={f.phone} onChange={F('phone')} /></div>
      <div className="fg"><label>City</label><input value={f.city} onChange={F('city')} /></div>
      <div className="fg"><label>State</label><input value={f.state} onChange={F('state')} /></div>
      <div className="fg"><label>GSTIN</label><input value={f.gstin} onChange={F('gstin')} /></div>
      <div className="fg"><label>Industry</label><input value={f.industry} onChange={F('industry')} /></div>
      <div className="fg"><label>Max Employees</label><input type="number" value={f.max_employees} onChange={F('max_employees')} min="1" /></div>
      <div className="fg"><label>Plan</label>
        <select value={f.subscription_plan} onChange={F('subscription_plan')}>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
      <div style={{ gridColumn:'1/-1', display:'flex', justifyContent:'flex-end', marginTop:8 }}>
        <button className="btn btn-pri btn-sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? 'Saving…' : '✓ Save Changes'}
        </button>
      </div>
    </div>
  );
}
