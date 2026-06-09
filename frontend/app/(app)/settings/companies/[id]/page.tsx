'use client';
import { useEffect, useState }  from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch }       from '../../../../../store';
import { setPageTitle }         from '../../../../../store/slices/uiSlice';
import { selectUser }           from '../../../../../store/slices/authSlice';
import { AppShell }             from '../../../../../layouts/AppLayout';
import { Modal }                from '../../../../../components/ui/Modal';
import { usePermission }        from '../../../../../features/auth/hooks/useAuth';
import { useAppSelector }       from '../../../../../store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient                from '../../../../../services/api/client';
import { showToast }            from '../../../../../utils/toast';
import { formatDate }           from '../../../../../utils/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuperAdmin {
  id:              number;
  email:           string;
  full_name:       string;
  employee_code:   string;
  avatar_url?:     string | null;
  is_platform_sa:  boolean;
  is_primary:      boolean;
  assigned_at:     string;
  is_current_user: boolean;
}

interface Manager {
  employee: { id:number; first_name:string; last_name:string; email:string; employee_code:string; avatar_url?:string|null; is_super_admin:boolean; };
  role:        { id:number; name:string; slug:string } | null;
  is_primary:  boolean;
  assigned_at: string;
  is_company_super_admin: boolean;
}

interface EligibleData {
  employees: { id:number; full_name:string; email:string; employee_code:string; is_super_admin:boolean }[];
  roles:     { id:number; name:string; slug:string }[];
}

interface CompanyDetail {
  id:number; name:string; slug:string; email?:string; phone?:string;
  city?:string; state?:string; subscription_plan:string; max_employees:number;
  employee_count:number; is_active:boolean; super_admin_count:number;
  managers:Manager[];
  roles: { id:number; name:string; slug:string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Av({ name, size=36 }: { name:string; size?:number }) {
  const i = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return <div style={{ width:size, height:size, borderRadius:'50%', background:'linear-gradient(135deg,var(--blue),var(--purple))', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.32, fontWeight:700, flexShrink:0 }}>{i}</div>;
}

// ─── Promote to SA Modal ──────────────────────────────────────────────────────

function PromoteModal({ companyId, currentSAs, onClose }: { companyId:number; currentSAs:number; onClose:()=>void }) {
  const qc = useQueryClient();
  const [selEmp, setSelEmp] = useState<EligibleData['employees'][0]|null>(null);
  const [search, setSearch] = useState('');

  // Get managers who are NOT already super admin
  const { data: managers = [] } = useQuery({
    queryKey: ['managers', companyId],
    queryFn:  () => apiClient.get<any,any>(`/companies/${companyId}/managers`),
    select:   (r:any) => (r.data as Manager[]).filter(m => !m.is_company_super_admin),
  });

  const filtered = managers.filter(m =>
    !search || m.employee.first_name.toLowerCase().includes(search.toLowerCase()) ||
    m.employee.email.toLowerCase().includes(search.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: () => apiClient.post<any,any>(`/companies/${companyId}/super-admins/${selEmp!.id}/promote`),
    onSuccess: (r:any) => {
      qc.invalidateQueries({ queryKey: ['company', companyId] });
      qc.invalidateQueries({ queryKey: ['company-super-admins', companyId] });
      showToast(`✓ ${r.data.message}`);
      onClose();
    },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });

  return (
    <Modal open={true} onClose={onClose} title="Promote to Company Super Admin"
      subtitle="Select an existing manager to promote to super admin"
      width={460}
      footer={<>
        <button className="btn btn-sec" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" onClick={() => mutation.mutate()} disabled={!selEmp || mutation.isPending}>
          {mutation.isPending ? 'Promoting…' : '⚡ Promote to Super Admin'}
        </button>
      </>}>
      <div style={{ background:'var(--amber-lt)', border:'1px solid var(--amber-bd)', borderRadius:'var(--r)', padding:'8px 12px', fontSize:11, color:'var(--amber)', marginBottom:12 }}>
        ⚡ Super admins have full access to this company — edit settings, assign managers, suspend. Currently <strong>{currentSAs}</strong> super admin{currentSAs !== 1 ? 's' : ''}.
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'7px 10px', marginBottom:10 }}>
        <span style={{ color:'var(--ink4)' }}>⌕</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} autoFocus placeholder="Search managers…"
          style={{ border:'none', background:'transparent', outline:'none', fontSize:12, fontFamily:'var(--font)', flex:1, color:'var(--ink)' }} />
      </div>
      <div style={{ border:'1px solid var(--border)', borderRadius:'var(--r2)', overflow:'hidden', maxHeight:240, overflowY:'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding:20, textAlign:'center', color:'var(--ink4)', fontSize:12 }}>
            All managers are already super admins, or no managers assigned yet.
          </div>
        ) : filtered.map(m => (
          <div key={m.employee.id} onClick={() => setSelEmp(m.employee as any)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', cursor:'pointer',
              borderBottom:'1px solid var(--border)', background: selEmp?.id===m.employee.id ? 'var(--blue-lt)' : 'transparent' }}>
            <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${selEmp?.id===m.employee.id?'var(--blue)':'var(--border2)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {selEmp?.id===m.employee.id && <div style={{ width:9, height:9, borderRadius:'50%', background:'var(--blue)' }} />}
            </div>
            <Av name={`${m.employee.first_name} ${m.employee.last_name}`} size={28} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{m.employee.first_name} {m.employee.last_name}</div>
              <div style={{ fontSize:10, color:'var(--ink4)' }}>{m.employee.employee_code} · {m.role?.name || 'No role'}</div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── Super Admins Tab ─────────────────────────────────────────────────────────

function SuperAdminsTab({ companyId, companyName }: { companyId:number; companyName:string }) {
  const qc          = useQueryClient();
  const currentUser = useAppSelector(selectUser);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const { data: superAdmins = [], isLoading } = useQuery({
    queryKey: ['company-super-admins', companyId],
    queryFn:  () => apiClient.get<any,any>(`/companies/${companyId}/super-admins`),
    select:   (r:any) => r.data as SuperAdmin[],
  });

  const demoteMut = useMutation({
    mutationFn: (empId:number) => apiClient.post<any,any>(`/companies/${companyId}/super-admins/${empId}/demote`),
    onSuccess: (r:any) => {
      qc.invalidateQueries({ queryKey:['company-super-admins', companyId] });
      qc.invalidateQueries({ queryKey:['company', companyId] });
      showToast(r.data.message);
    },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });

  const saCount = superAdmins.length;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>Company Super Admins</div>
          <div style={{ fontSize:12, color:'var(--ink4)', marginTop:2 }}>
            Full access to manage <strong>{companyName}</strong>.
            At least 1 super admin required at all times.
          </div>
        </div>
        <button className="btn btn-pri btn-sm" onClick={() => setPromoteOpen(true)}>⚡ Promote Manager</button>
      </div>

      {/* Min-1 warning */}
      {saCount === 1 && (
        <div style={{ background:'var(--amber-lt)', border:'1px solid var(--amber-bd)', borderRadius:'var(--r)', padding:'10px 14px', fontSize:12, color:'var(--amber)', marginBottom:14, lineHeight:1.6 }}>
          ⚠ Only 1 super admin. You cannot remove them until you promote another manager to super admin.
        </div>
      )}

      {/* Super admin cards */}
      {isLoading ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--ink4)' }}>Loading…</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {superAdmins.map(sa => (
            <div key={sa.id} style={{ background:'var(--surface)', border:'1px solid var(--border)',
              borderLeft:'3px solid var(--purple)', borderRadius:'var(--r3)',
              padding:'14px 18px', display:'flex', alignItems:'center', gap:14, boxShadow:'var(--sh)' }}>
              <Av name={sa.full_name} size={44} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>{sa.full_name}</span>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--purple-lt)', color:'var(--purple)', border:'1px solid var(--purple-bd)' }}>
                    ⚡ Super Admin
                  </span>
                  {sa.is_platform_sa && (
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--red-lt)', color:'var(--red)', border:'1px solid var(--red-bd)' }}>
                      Platform SA
                    </span>
                  )}
                  {sa.is_primary && (
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--amber-lt)', color:'var(--amber)', border:'1px solid var(--amber-bd)' }}>
                      ★ Primary
                    </span>
                  )}
                  {sa.is_current_user && (
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--blue-lt)', color:'var(--blue)', border:'1px solid var(--blue-md)' }}>
                      YOU
                    </span>
                  )}
                </div>
                <div style={{ fontSize:11, color:'var(--ink4)', marginTop:3 }}>
                  {sa.employee_code} · {sa.email} · Since {formatDate(sa.assigned_at)}
                </div>
              </div>
              {/* Demote button — disabled if last SA or current user */}
              {!sa.is_current_user && !sa.is_platform_sa && (
                <button
                  className="btn btn-sec btn-sm"
                  style={{ fontSize:11, color: saCount <= 1 ? 'var(--ink4)' : 'var(--amber)', flexShrink:0 }}
                  disabled={saCount <= 1}
                  title={saCount <= 1 ? 'Cannot demote: must have at least 1 super admin' : 'Demote to HR Manager'}
                  onClick={() => { if(window.confirm(`Demote ${sa.full_name} from super admin? Their role will change to HR Manager.`)) demoteMut.mutate(sa.id); }}>
                  ↓ Demote
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {promoteOpen && <PromoteModal companyId={companyId} currentSAs={saCount} onClose={() => setPromoteOpen(false)} />}
    </div>
  );
}

// ─── Assign Manager Modal ─────────────────────────────────────────────────────

function AssignManagerModal({ companyId, onClose }: { companyId:number; onClose:()=>void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selEmp, setSelEmp] = useState<EligibleData['employees'][0]|null>(null);
  const [roleSlug, setRoleSlug] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['eligible', companyId],
    queryFn:  () => apiClient.get<any,any>(`/companies/${companyId}/eligible-managers`),
    select:   (r:any) => r.data as EligibleData,
  });
  useEffect(() => {
    if (data?.roles?.length && !roleSlug) {
      const def = data.roles.find(r => r.slug === 'hr_manager') || data.roles[0];
      if (def) setRoleSlug(def.slug);
    }
  }, [data]);

  const filtered = (data?.employees||[]).filter(e =>
    !search || e.full_name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: () => apiClient.post<any,any>(`/companies/${companyId}/managers`, { employee_id: selEmp!.id, role_slug: roleSlug, is_primary: isPrimary }),
    onSuccess: (r:any) => { qc.invalidateQueries({ queryKey:['company',companyId] }); showToast(`✓ ${r.data.message}`); onClose(); },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });

  return (
    <Modal open={true} onClose={onClose} title="Assign Manager" width={500}
      footer={<>
        <button className="btn btn-sec" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" onClick={() => mutation.mutate()} disabled={!selEmp || !roleSlug || mutation.isPending}>
          {mutation.isPending ? 'Assigning…' : '✓ Assign Manager'}
        </button>
      </>}>
      <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'7px 10px', marginBottom:10 }}>
        <span style={{ color:'var(--ink4)' }}>⌕</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} autoFocus placeholder="Search employees…"
          style={{ border:'none', background:'transparent', outline:'none', fontSize:12, fontFamily:'var(--font)', flex:1 }} />
      </div>
      <div style={{ border:'1px solid var(--border)', borderRadius:'var(--r2)', overflow:'hidden', maxHeight:200, overflowY:'auto', marginBottom:14 }}>
        {isLoading ? <div style={{ padding:16, textAlign:'center', color:'var(--ink4)', fontSize:12 }}>Loading…</div>
        : filtered.map(emp => (
          <div key={emp.id} onClick={() => setSelEmp(emp)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', cursor:'pointer',
              borderBottom:'1px solid var(--border)', background: selEmp?.id===emp.id ? 'var(--blue-lt)' : 'transparent' }}>
            <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${selEmp?.id===emp.id?'var(--blue)':'var(--border2)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {selEmp?.id===emp.id && <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--blue)' }} />}
            </div>
            <Av name={emp.full_name} size={26} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600 }}>{emp.full_name}</div>
              <div style={{ fontSize:10, color:'var(--ink4)' }}>{emp.employee_code} · {emp.email}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="fg" style={{ marginBottom:10 }}>
        <label>Role in this Company</label>
        <select value={roleSlug} onChange={e=>setRoleSlug(e.target.value)}
          style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border2)', borderRadius:'var(--r)', fontSize:12, fontFamily:'var(--font)', background:'var(--surface)', color:'var(--ink)' }}>
          <option value="">— Select Role —</option>
          {(data?.roles||[]).map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}
        </select>
        {roleSlug && <div style={{ fontSize:10, color:'var(--ink4)', marginTop:4 }}>Default permissions of <strong>{data?.roles.find(r=>r.slug===roleSlug)?.name}</strong> apply automatically.</div>}
      </div>
      <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, cursor:'pointer' }}>
        <input type="checkbox" checked={isPrimary} onChange={e=>setIsPrimary(e.target.checked)} style={{ width:14, height:14, accentColor:'var(--blue)' }} />
        Set as primary contact
      </label>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const { id }    = useParams();
  const companyId = Number(id);
  const dispatch  = useAppDispatch();
  const router    = useRouter();
  const qc        = useQueryClient();
  const { canEdit } = usePermission();

  const [tab,        setTab]        = useState<'overview'|'managers'|'super-admins'|'settings'>('overview');
  const [assignOpen, setAssignOpen] = useState(false);

  const removeMgr = useMutation({
    mutationFn: (empId:number) => apiClient.delete<any,any>(`/companies/${companyId}/managers/${empId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['company',companyId] }); showToast('Manager removed'); },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn:  () => apiClient.get<any,any>(`/companies/${companyId}`),
    select:   (r:any) => r.data as CompanyDetail,
  });

  useEffect(() => { if (company) dispatch(setPageTitle({ title: company.name, breadcrumb: 'Companies' })); }, [company, dispatch]);

  if (isLoading) return <AppShell><div style={{ padding:40, textAlign:'center', color:'var(--ink4)' }}>Loading…</div></AppShell>;
  if (!company)  return <AppShell><div style={{ padding:40, textAlign:'center', color:'var(--ink4)' }}>Not found</div></AppShell>;

  const tabs = [
    { id:'overview',    label:'Overview' },
    { id:'managers',    label:`Managers (${company.managers?.length||0})` },
    { id:'super-admins',label:`Super Admins (${company.super_admin_count||0})` },
    { id:'settings',    label:'Settings' },
  ];

  return (
    <AppShell>
      <div className="pg-enter">
        {/* Header */}
        <div className="ph" style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={() => router.push('/settings/companies')}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink4)', fontSize:14, padding:4 }}>←</button>
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
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--purple-lt)', color:'var(--purple)', border:'1px solid var(--purple-bd)' }}>
                  ⚡ {company.super_admin_count} SA
                </span>
              </div>
              <div style={{ fontSize:12, color:'var(--ink4)', marginTop:2 }}>
                /{company.slug} · {company.subscription_plan} · {company.employee_count}/{company.max_employees} employees
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'2px solid var(--border)', marginBottom:24 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ padding:'10px 20px', border:'none', background:'transparent', cursor:'pointer',
                fontFamily:'var(--font)', fontSize:13,
                fontWeight: tab===t.id ? 600 : 400,
                color: tab===t.id ? 'var(--blue)' : 'var(--ink4)',
                borderBottom: tab===t.id ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom:-2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview ──────────────────────────────────────── */}
        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r3)', padding:20, boxShadow:'var(--sh)' }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', marginBottom:14 }}>Company Info</div>
              {[['Email',company.email||'—'],['Plan',company.subscription_plan],['Employees',`${company.employee_count} / ${company.max_employees}`],['Super Admins',`${company.super_admin_count}`]].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                  <span style={{ color:'var(--ink4)' }}>{l}</span>
                  <span style={{ fontWeight:500, color:'var(--ink)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r3)', padding:20, boxShadow:'var(--sh)' }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', marginBottom:14 }}>Roles</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {company.roles?.map(r => (
                  <span key={r.id} style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background: r.slug==='super_admin' ? 'var(--purple-lt)' : 'var(--surface2)', color: r.slug==='super_admin' ? 'var(--purple)' : 'var(--ink3)', border:'1px solid var(--border)' }}>{r.name}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Managers ──────────────────────────────────────── */}
        {tab === 'managers' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:600 }}>All Managers</div>
              {canEdit('companies') && <button className="btn btn-pri btn-sm" onClick={() => setAssignOpen(true)}>+ Assign Manager</button>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(company.managers||[]).map(m => (
                <div key={m.employee.id} style={{ background:'var(--surface)', border:'1px solid var(--border)',
                  borderLeft:`3px solid ${m.is_company_super_admin ? 'var(--purple)' : 'var(--blue)'}`,
                  borderRadius:'var(--r3)', padding:'12px 18px', display:'flex', alignItems:'center', gap:12, boxShadow:'var(--sh)' }}>
                  <Av name={`${m.employee.first_name} ${m.employee.last_name}`} size={38} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{m.employee.first_name} {m.employee.last_name}</span>
                      {m.role && (
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                          background: m.is_company_super_admin ? 'var(--purple-lt)' : 'var(--blue-lt)',
                          color: m.is_company_super_admin ? 'var(--purple)' : 'var(--blue)',
                          border: `1px solid ${m.is_company_super_admin ? 'var(--purple-bd)' : 'var(--blue-md)'}` }}>
                          {m.is_company_super_admin && '⚡ '}{m.role.name}
                        </span>
                      )}
                      {m.is_primary && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:'var(--amber-lt)', color:'var(--amber)', border:'1px solid var(--amber-bd)', fontWeight:700 }}>★ Primary</span>}
                    </div>
                    <div style={{ fontSize:10, color:'var(--ink4)', marginTop:2 }}>{m.employee.employee_code} · {m.employee.email}</div>
                  </div>
                  {canEdit('companies') && !m.is_company_super_admin && (
                    <button className="btn btn-sec btn-sm" style={{ fontSize:11, color:'var(--red)' }}
                      onClick={() => { if(window.confirm(`Remove ${m.employee.first_name}?`)) removeMgr.mutate(m.employee.id); }}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Super Admins ───────────────────────────────────── */}
        {tab === 'super-admins' && (
          <SuperAdminsTab companyId={companyId} companyName={company.name} />
        )}

        {/* ── Settings ──────────────────────────────────────── */}
        {tab === 'settings' && (
          <div style={{ maxWidth:520 }}>
            {canEdit('companies') && (
              <div style={{ background:'var(--red-lt)', border:'1px solid var(--red-bd)', borderRadius:'var(--r3)', padding:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--red)', marginBottom:6 }}>Danger Zone</div>
                {company.is_active
                  ? <button className="btn btn-sec btn-sm" style={{ fontSize:11, color:'var(--red)', borderColor:'var(--red-bd)' }}
                      onClick={() => { if(window.confirm(`Suspend ${company.name}?`)) apiClient.post<any,any>(`/companies/${companyId}/suspend`).then(() => { qc.invalidateQueries({ queryKey:['company',companyId] }); showToast('Company suspended'); }); }}>
                      ⏸ Suspend Company
                    </button>
                  : <button className="btn btn-sec btn-sm" style={{ fontSize:11, color:'var(--green)', borderColor:'var(--green-bd)' }}
                      onClick={() => apiClient.post<any,any>(`/companies/${companyId}/activate`).then(() => { qc.invalidateQueries({ queryKey:['company',companyId] }); showToast('✓ Activated'); })}>
                      ▶ Activate Company
                    </button>
                }
              </div>
            )}
          </div>
        )}
      </div>

      {assignOpen && <AssignManagerModal companyId={companyId} onClose={() => setAssignOpen(false)} />}
    </AppShell>
  );
}
