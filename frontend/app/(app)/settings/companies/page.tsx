'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '../../../../store';
import { setPageTitle } from '../../../../store/slices/uiSlice';
import { AppShell } from '../../../../layouts/AppLayout';
import { Modal } from '../../../../components/ui/Modal';
import { usePermission } from '../../../../hooks/usePermission';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/client';
import { showToast } from '../../../../utils/toast';
import { formatDate } from '../../../../utils/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: number;
  name: string;
  slug: string | null;
  city?: string | null;
  state?: string | null;
  country?: string;
  industry?: string | null;
  email?: string | null;
  subscription_plan: string;
  max_employees: number;
  employee_count: number;
  is_active: boolean;
  onboarding_step: number;
  created_at: string;
  primary_manager?: {
    id: number;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
  } | null;
}

interface EligibleEmployee {
  id: number;
  full_name: string;
  email: string;
  employee_code: string;
  is_super_admin: boolean;
}

interface PlatformStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalEmployees: number;
  plans: Record<string, number>;
}

// ─── Small components ─────────────────────────────────────────────────────────

function StatusBadge({ c }: { c: Company }) {
  if (!c.is_active) return <span className="badge-red">Suspended</span>;
  if (c.onboarding_step < 5) return <span className="badge-amber">Setup</span>;
  return <span className="badge-green">Active</span>;
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, React.CSSProperties> = {
    starter: { background: 'var(--surface2)', color: 'var(--ink4)' },
    growth: { background: 'var(--blue-lt)', color: 'var(--blue)' },
    enterprise: { background: 'var(--purple-lt)', color: 'var(--purple)' },
  };
  const s = styles[plan] || styles.starter;
  return (
    <span style={{
      ...s, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      textTransform: 'uppercase', letterSpacing: '.05em', border: '1px solid transparent', whiteSpace: 'nowrap'
    }}>
      {plan}
    </span>
  );
}

function Av({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,var(--blue),var(--purple))',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * .34, fontWeight: 700, flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'var(--ink)' }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 150, background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r3)', padding: '16px 20px', boxShadow: 'var(--sh)'
    }}>
      <div style={{ fontSize: 26, fontWeight: 500, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Create Company Modal ─────────────────────────────────────────────────────

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [search, setSearch] = useState('');
  const [selectedMgrs, setSelectedMgrs] = useState<number[]>([]);

  const [f, setF] = useState({
    name: '',
    city: '',
    state: '',
    country: 'India',
    industry: '',
    email: '',
    phone: '',
    subscription_plan: 'starter',
    max_employees: '100',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    // First admin employee
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
    admin_phone: '',
  });
  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  // Reset on open
  useEffect(() => {
    if (open) { setStep(1); setSearch(''); setSelectedMgrs([]); setF(p => ({ ...p, name: '', admin_first_name: '', admin_last_name: '', admin_email: '', admin_phone: '' })); }
  }, [open]);

  // Load eligible managers
  const { data: eligible = [] } = useQuery({
    queryKey: ['eligible-managers-global'],
    queryFn: () => apiClient.get<any, any>('/companies/1/eligible-managers'),
    enabled: open && step === 2,
    select: (r: any) => r.data as EligibleEmployee[],
  });

  // Actually fetch all eligible across platform for creation
  const { data: allEligible = [] } = useQuery({
    queryKey: ['all-eligible-managers'],
    queryFn: async () => {
      // For creation, use a platform-wide endpoint
      const r = await apiClient.get<any, any>('/companies/eligible-managers');
      return r.data as EligibleEmployee[];
    },
    enabled: open && step === 2,
  });

  const filtered = useMemo(() =>
    allEligible.filter(e =>
      !search ||
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase())
    ), [allEligible, search]);

  const mutation = useMutation({
    mutationFn: () => apiClient.post<any, any>('/companies', {
      ...f,
      max_employees: Number(f.max_employees),
      manager_employee_ids: selectedMgrs,
    }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['company-stats'] });
      showToast(`✓ ${r.data.name} created`);
      onClose();
    },
    onError: (e: any) => showToast(e?.message || 'Failed to create company'),
  });

  const step1Valid = f.name.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Create New Company" width={560}
      footer={
        step === 1 ? (
          <>
            <button className="btn btn-sec" onClick={onClose}>Cancel</button>
            <button className="btn btn-pri" onClick={() => setStep(2)} disabled={!step1Valid}>
              Next: Assign Managers →
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-sec" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-pri" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : '✓ Create Company'}
            </button>
          </>
        )
      }>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, marginTop: -4 }}>
        {['Company Details', 'Assign Managers'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: i < step ? 'var(--green)' : i + 1 === step ? 'var(--blue)' : 'var(--surface2)',
                color: i + 1 <= step ? '#fff' : 'var(--ink4)',
                border: `2px solid ${i + 1 <= step ? (i + 1 === step ? 'var(--blue)' : 'var(--green)') : 'var(--border2)'}`,
              }}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: 12, fontWeight: i + 1 === step ? 600 : 400,
                color: i + 1 === step ? 'var(--blue)' : i + 1 < step ? 'var(--green)' : 'var(--ink4)'
              }}>
                {label}
              </span>
            </div>
            {i < 1 && (
              <div style={{ flex: 1, height: 2, background: step > 1 ? 'var(--green)' : 'var(--border)', margin: '0 12px', borderRadius: 99 }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Company Details ───────────────────────── */}
      {step === 1 && (
        <>
          {/* Company info */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink4)', marginBottom: 10 }}>Company Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="fg" style={{ gridColumn: '1/-1' }}>
              <label>Company Name *</label>
              <input autoFocus value={f.name} onChange={F('name')} placeholder="e.g. Nexgen Solutions Pvt Ltd" />
            </div>
            <div className="fg"><label>City</label><input value={f.city} onChange={F('city')} /></div>
            <div className="fg"><label>State</label><input value={f.state} onChange={F('state')} /></div>
            <div className="fg"><label>Industry</label>
              <select value={f.industry} onChange={F('industry')}>
                <option value="">— Select —</option>
                {['Technology', 'Manufacturing', 'Finance', 'Healthcare', 'Education', 'Retail', 'Logistics', 'Media', 'Real Estate', 'Other'].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="fg"><label>Company Email</label><input type="email" value={f.email} onChange={F('email')} /></div>
            <div className="fg"><label>Plan</label>
              <select value={f.subscription_plan} onChange={F('subscription_plan')}>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="fg"><label>Max Employees</label><input type="number" value={f.max_employees} onChange={F('max_employees')} min="1" /></div>
          </div>

          {/* First admin employee */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink4)', margin: '16px 0 10px' }}>First Admin Employee</div>
          <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 11, color: 'var(--blue)', marginBottom: 12 }}>
            ℹ This creates the first employee who manages this company. They can log in via OTP. Leave email blank to skip.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="fg"><label>First Name</label><input value={f.admin_first_name} onChange={F('admin_first_name')} placeholder="Admin" /></div>
            <div className="fg"><label>Last Name</label><input value={f.admin_last_name} onChange={F('admin_last_name')} placeholder="User" /></div>
            <div className="fg"><label>Email</label><input type="email" value={f.admin_email} onChange={F('admin_email')} placeholder="admin@company.com" /></div>
            <div className="fg"><label>Phone</label><input value={f.admin_phone} onChange={F('admin_phone')} placeholder="+91 9999999999" /></div>
          </div>
        </>
      )}

      {/* ── Step 2: Assign Managers ───────────────────────── */}
      {step === 2 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink4)', marginBottom: 8 }}>
            Select employees to manage <strong>{f.name}</strong>
          </div>
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 11, color: 'var(--ink3)', marginBottom: 12 }}>
            You (the creator) are automatically assigned as <strong>Owner</strong>. Select additional managers below. Only employees with <code>companies:manage</code> permission or super admins are shown.
          </div>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '7px 10px', marginBottom: 8 }}>
            <span style={{ color: 'var(--ink4)' }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, code…"
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontFamily: 'var(--font)', flex: 1, color: 'var(--ink)' }} />
          </div>

          {/* List */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r2)', overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink4)', fontSize: 12 }}>
                No eligible employees found.<br />Employees need <code>companies:manage</code> permission or super admin status.
              </div>
            ) : filtered.map(emp => {
              const checked = selectedMgrs.includes(emp.id);
              return (
                <div key={emp.id} onClick={() => setSelectedMgrs(p => checked ? p.filter(x => x !== emp.id) : [...p, emp.id])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: checked ? 'var(--blue-lt)' : 'transparent'
                  }}>
                  <input type="checkbox" readOnly checked={checked}
                    style={{ width: 14, height: 14, accentColor: 'var(--blue)', cursor: 'pointer', flexShrink: 0 }} />
                  <Av name={emp.full_name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {emp.full_name}
                      {emp.is_super_admin && (
                        <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--purple-lt)', color: 'var(--purple)', border: '1px solid var(--purple-bd)', borderRadius: 3, padding: '1px 5px' }}>⚡ SA</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{emp.employee_code} · {emp.email}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedMgrs.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--green)' }}>
              ✓ {selectedMgrs.length} manager{selectedMgrs.length !== 1 ? 's' : ''} selected (+ you as owner = {selectedMgrs.length + 1} total)
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const qc = useQueryClient();
  const { canEdit, isSuperAdmin } = usePermission();

  useEffect(() => { dispatch(setPageTitle({ title: 'Companies', breadcrumb: 'Settings' })); }, [dispatch]);

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['company-stats'],
    queryFn: () => apiClient.get<any, any>('/companies/platform-stats'),
    enabled: isSuperAdmin,
    select: (r: any) => r.data as PlatformStats,
  });

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', search, planFilter],
    queryFn: () => apiClient.get<any, any>(`/companies?${new URLSearchParams({ ...(search ? { search } : {}), ...(planFilter ? { plan: planFilter } : {}) })}`),
    select: (r: any) => r.data?.rows ?? r.data ?? [],
  });

  const suspendMut = useMutation({
    mutationFn: (id: number) => apiClient.post<any, any>(`/companies/${id}/suspend`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); showToast('Company suspended'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
  const activateMut = useMutation({
    mutationFn: (id: number) => apiClient.post<any, any>(`/companies/${id}/activate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); showToast('✓ Company activated'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  return (
    <AppShell>
      <div className="pg-enter">
        {/* Header */}
        <div className="ph">
          <div>
            <h1>Companies</h1>
            <p>{isSuperAdmin ? 'Manage all companies on the platform' : 'Companies you manage'}</p>
          </div>
          {canEdit('companies') && (
            <button className="btn btn-pri" onClick={() => setCreateOpen(true)}>+ New Company</button>
          )}
        </div>
        {isSuperAdmin && stats && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <StatCard label="Total Companies" value={stats.totalCompanies} color="var(--ink)" />
            <StatCard label="Active" value={stats.activeCompanies} color="var(--green)" />
            <StatCard label="Suspended" value={stats.suspendedCompanies} color="var(--red)" />
            <StatCard label="Total Employees" value={stats.totalEmployees} color="var(--blue)" />
            {Object.entries(stats.plans || {}).map(([plan, count]) => (
              <StatCard key={plan} label={plan} value={count} sub="companies" />
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 12px' }}>
            <span style={{ color: 'var(--ink4)' }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies…"
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, fontFamily: 'var(--font)', flex: 1, color: 'var(--ink)' }} />
          </div>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 12, fontFamily: 'var(--font)', background: 'var(--surface)', color: 'var(--ink)' }}>
            <option value="">All plans</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 72, borderRadius: 'var(--r3)', background: 'var(--surface)', border: '1px solid var(--border)' }}><div className="skeleton" style={{ height: '100%', borderRadius: 'var(--r3)' }} /></div>)}
          </div>
        ) : companies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No companies yet</div>
            {canEdit('companies') && <button className="btn btn-pri btn-sm" onClick={() => setCreateOpen(true)}>+ Create First Company</button>}
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', overflow: 'hidden', boxShadow: 'var(--sh)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Company', 'Plan', 'Employees', 'Manager', 'Status', 'Created', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10,
                      textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink4)',
                      borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((co: Company) => (
                  <tr key={co.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => router.push(`/settings/companies/${co.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 'var(--r)', background: 'linear-gradient(135deg,var(--blue),var(--purple))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0
                        }}>
                          {co.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{co.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 1 }}>
                            {co.slug} {co.city ? `· ${co.city}` : ''} {co.state ? `, ${co.state}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}><PlanBadge plan={co.subscription_plan} /></td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, color: co.employee_count > co.max_employees * 0.9 ? 'var(--amber)' : 'var(--ink3)' }}>
                        {co.employee_count} / {co.max_employees}
                      </div>
                      <div style={{ marginTop: 3, height: 4, background: 'var(--border)', borderRadius: 99, width: 80, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99, width: `${Math.min(100, co.employee_count / co.max_employees * 100)}%`,
                          background: co.employee_count > co.max_employees * 0.9 ? 'var(--amber)' : 'var(--blue)'
                        }} />
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {co.primary_manager ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Av name={`${co.primary_manager.first_name} ${co.primary_manager.last_name}`} size={26} />
                          <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{co.primary_manager.first_name} {co.primary_manager.last_name}</span>
                        </div>
                      ) : <span style={{ fontSize: 11, color: 'var(--ink4)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge c={co} /></td>
                    <td style={{ padding: '12px 14px', color: 'var(--ink4)' }}>{formatDate(co.created_at)}</td>
                    <td style={{ padding: '12px 14px', display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sec btn-sm" style={{ fontSize: 11 }}
                        onClick={() => router.push(`/settings/companies/${co.id}`)}>
                        Open →
                      </button>
                      {canEdit('companies') && (
                        co.is_active
                          ? <button className="btn btn-sec btn-sm" style={{ fontSize: 11, color: 'var(--amber)' }}
                            onClick={() => { if (window.confirm(`Suspend ${co.name}?`)) suspendMut.mutate(co.id); }}>
                            ⏸
                          </button>
                          : <button className="btn btn-sec btn-sm" style={{ fontSize: 11, color: 'var(--green)' }}
                            onClick={() => activateMut.mutate(co.id)}>
                            ▶
                          </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell >
  );
}
