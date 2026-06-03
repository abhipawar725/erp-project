'use client';
import { useEffect, useState } from 'react';
import { useParams }           from 'next/navigation';
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

interface CompanyUser {
  id:                  number;
  email:               string;
  is_active:           boolean;
  has_employee_record: boolean;
  full_name:           string | null;
  role:                { id: number; name: string; slug: string } | null;
  employee?:           { id: number; employee_code: string } | null;
  created_at:          string;
}

interface CompanyEmployee {
  id:              number;
  employee_code:   string;
  first_name:      string;
  last_name:       string;
  full_name:       string;
  email:           string;
  has_login:       boolean;
  role?:           { name: string; slug: string } | null;
  department?:     { id: number; name: string } | null;
  designation?:    { id: number; name: string } | null;
  date_of_joining: string | null;
}

interface Department { id: number; name: string; code: string; }
interface Designation { id: number; name: string; }
interface Role { id: number; name: string; slug: string; }

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Av({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,var(--blue),var(--purple))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 600, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({ open, companyId, roles, onClose }: { open: boolean; companyId: number; roles: Role[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [roleSlug, setRoleSlug] = useState('emp');

  useEffect(() => { if (open) { setEmail(''); setPassword(''); setRoleSlug('emp'); } }, [open]);

  const mutation = useMutation({
    mutationFn: () => apiClient.post<any,any>(`/admin/companies/${companyId}/users`, { email, password, role_slug: roleSlug }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['company-users', companyId] });
      showToast(`✓ User ${r.data.email} created`);
      onClose();
    },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Add User to Company" subtitle="Creates login credentials — convert to employee after to assign HR permissions" width={420}
      footer={<>
        <button className="btn btn-sec" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" onClick={() => mutation.mutate()} disabled={!email || !password || mutation.isPending}>
          {mutation.isPending ? 'Creating…' : '✓ Create User'}
        </button>
      </>}>
      <div className="fg"><label>Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus placeholder="user@company.com" /></div>
      <div className="fg"><label>Temporary Password *</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min 6 characters" /></div>
      <div className="fg">
        <label>Role</label>
        <select value={roleSlug} onChange={e => setRoleSlug(e.target.value)}>
          {roles.map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}
        </select>
      </div>
      <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 11, color: 'var(--blue)', marginTop: 6 }}>
        ℹ After creating, click "Convert to Employee" on the user to create their HR record (name, department, designation). Only then will they appear in employee lists and permission assignments.
      </div>
    </Modal>
  );
}

// ─── Convert to Employee Modal ────────────────────────────────────────────────

function ConvertModal({ open, user, companyId, departments, designations, onClose }: {
  open: boolean; user: CompanyUser | null; companyId: number;
  departments: Department[]; designations: Designation[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({ first_name: '', last_name: '', department_id: '', designation_id: '', date_of_joining: new Date().toISOString().slice(0, 10), gender: '', phone: '' });
  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({...p, [k]: e.target.value}));

  useEffect(() => {
    if (open && user) {
      const parts = (user.full_name || '').split(' ');
      setF(p => ({ ...p, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' }));
    }
  }, [open, user]);

  const mutation = useMutation({
    mutationFn: () => apiClient.post<any,any>(
      `/admin/companies/${companyId}/users/${user!.id}/convert-to-employee`,
      { ...f, department_id: f.department_id ? Number(f.department_id) : null, designation_id: f.designation_id ? Number(f.designation_id) : null }
    ),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['company-users',     companyId] });
      qc.invalidateQueries({ queryKey: ['company-employees', companyId] });
      showToast(`✓ ${r.data.full_name} (${r.data.employee_code}) is now an employee`);
      onClose();
    },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Convert to Employee" subtitle={`Create HR record for ${user?.email}`} width={500}
      footer={<>
        <button className="btn btn-sec" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" onClick={() => mutation.mutate()} disabled={!f.first_name || !f.last_name || mutation.isPending}>
          {mutation.isPending ? 'Converting…' : '✓ Convert to Employee'}
        </button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div className="fg"><label>First Name *</label><input autoFocus value={f.first_name} onChange={F('first_name')} /></div>
        <div className="fg"><label>Last Name *</label><input value={f.last_name} onChange={F('last_name')} /></div>
        <div className="fg">
          <label>Department</label>
          <select value={f.department_id} onChange={F('department_id')}>
            <option value="">— Select —</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>Designation</label>
          <select value={f.designation_id} onChange={F('designation_id')}>
            <option value="">— Select —</option>
            {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="fg"><label>Date of Joining</label><input type="date" value={f.date_of_joining} onChange={F('date_of_joining')} /></div>
        <div className="fg"><label>Gender</label>
          <select value={f.gender} onChange={F('gender')}>
            <option value="">— Select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="fg" style={{ gridColumn: '1/-1' }}><label>Phone</label><input value={f.phone} onChange={F('phone')} /></div>
      </div>
      <div style={{ background: 'var(--green-lt)', border: '1px solid var(--green-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 11, color: 'var(--green)', marginTop: 6 }}>
        ✓ After conversion this person will appear in: Employee list, Permission Group member picker, User Permissions, Leave/Attendance records.
      </div>
    </Modal>
  );
}

// ─── Add Employee Modal (direct, with optional login) ─────────────────────────

function AddEmployeeModal({ open, companyId, departments, designations, roles, onClose }: {
  open: boolean; companyId: number; departments: Department[]; designations: Designation[]; roles: Role[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({ first_name: '', last_name: '', email: '', department_id: '', designation_id: '', date_of_joining: new Date().toISOString().slice(0, 10), gender: '', phone: '', employment_type: 'Full_Time', create_login: false, login_password: '', role_slug: 'emp' });
  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({...p, [k]: e.target.value}));

  useEffect(() => { if (open) setF(p => ({ ...p, first_name: '', last_name: '', email: '', login_password: '' })); }, [open]);

  const mutation = useMutation({
    mutationFn: () => apiClient.post<any,any>(`/admin/companies/${companyId}/employees`, {
      ...f, department_id: f.department_id ? Number(f.department_id) : null, designation_id: f.designation_id ? Number(f.designation_id) : null,
    }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['company-employees', companyId] });
      qc.invalidateQueries({ queryKey: ['company-users',     companyId] });
      showToast(`✓ ${r.data.full_name} (${r.data.employee_code}) added`);
      onClose();
    },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Add Employee" subtitle="Creates HR record directly — login optional" width={520}
      footer={<>
        <button className="btn btn-sec" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" onClick={() => mutation.mutate()} disabled={!f.first_name || !f.last_name || !f.email || mutation.isPending}>
          {mutation.isPending ? 'Adding…' : '✓ Add Employee'}
        </button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div className="fg"><label>First Name *</label><input autoFocus value={f.first_name} onChange={F('first_name')} /></div>
        <div className="fg"><label>Last Name *</label><input value={f.last_name} onChange={F('last_name')} /></div>
        <div className="fg" style={{ gridColumn: '1/-1' }}><label>Work Email *</label><input type="email" value={f.email} onChange={F('email')} /></div>
        <div className="fg">
          <label>Department</label>
          <select value={f.department_id} onChange={F('department_id')}>
            <option value="">— Select —</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>Designation</label>
          <select value={f.designation_id} onChange={F('designation_id')}>
            <option value="">— Select —</option>
            {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="fg"><label>Joining Date</label><input type="date" value={f.date_of_joining} onChange={F('date_of_joining')} /></div>
        <div className="fg"><label>Gender</label>
          <select value={f.gender} onChange={F('gender')}>
            <option value="">— Select —</option>
            <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
          </select>
        </div>
        <div className="fg"><label>Employment Type</label>
          <select value={f.employment_type} onChange={F('employment_type')}>
            <option value="Full_Time">Full Time</option><option value="Part_Time">Part Time</option>
            <option value="Contract">Contract</option><option value="Intern">Intern</option>
          </select>
        </div>
        <div className="fg"><label>Phone</label><input value={f.phone} onChange={F('phone')} /></div>
      </div>

      {/* Login toggle */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          <input type="checkbox" checked={f.create_login} onChange={e => setF(p => ({...p, create_login: e.target.checked}))}
            style={{ width: 14, height: 14, accentColor: 'var(--blue)' }} />
          Also create portal login for this employee
        </label>
        {f.create_login && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginTop: 10 }}>
            <div className="fg"><label>Password *</label><input type="password" value={f.login_password} onChange={F('login_password')} placeholder="min 6 characters" /></div>
            <div className="fg"><label>Role</label>
              <select value={f.role_slug} onChange={F('role_slug')}>
                {roles.map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const { id: companyId } = useParams();
  const dispatch = useAppDispatch();
  const { isSuperAdmin, canView } = usePermission();
  const qc = useQueryClient();
  const cId = Number(companyId);

  const [tab,          setTab]          = useState<'users' | 'employees'>('employees');
  const [addUserOpen,  setAddUserOpen]  = useState(false);
  const [addEmpOpen,   setAddEmpOpen]   = useState(false);
  const [convertUser,  setConvertUser]  = useState<CompanyUser | null>(null);

  // Load company + supporting data
  const { data: company }      = useQuery({ queryKey: ['company', cId], queryFn: () => apiClient.get<any,any>(`/admin/companies/${cId}`), select: (r: any) => r.data });
  const { data: users = [] }   = useQuery({ queryKey: ['company-users', cId],     queryFn: () => apiClient.get<any,any>(`/admin/companies/${cId}/users`),     select: (r: any) => r.data?.rows ?? [] });
  const { data: employees = []} = useQuery({ queryKey: ['company-employees', cId], queryFn: () => apiClient.get<any,any>(`/admin/companies/${cId}/employees`),  select: (r: any) => r.data?.rows ?? [] });
  const { data: departments = []} = useQuery({ queryKey: ['departments', cId], queryFn: () => apiClient.get<any,any>(`/departments?company_id=${cId}`), select: (r: any) => r.data ?? [] });
  const { data: designations = []} = useQuery({ queryKey: ['designations', cId], queryFn: () => apiClient.get<any,any>(`/designations?company_id=${cId}`), select: (r: any) => r.data ?? [] });
  const { data: roles = [] }   = useQuery({ queryKey: ['roles', cId], queryFn: () => apiClient.get<any,any>(`/rbac/roles`), select: (r: any) => r.data ?? [] });

  useEffect(() => { if (company) dispatch(setPageTitle({ title: company.name, breadcrumb: 'Companies' })); }, [company, dispatch]);

  const createLoginMutation = useMutation({
    mutationFn: ({ empId, password }: { empId: number; password: string }) =>
      apiClient.post<any,any>(`/admin/companies/${cId}/employees/${empId}/create-login`, { password, role_slug: 'emp' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company-employees', cId] }); showToast('✓ Login created'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  if (!company) return <AppShell><div style={{ padding: 40, textAlign: 'center', color: 'var(--ink4)' }}>Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="pg-enter">
        {/* Header */}
        <div className="ph">
          <div>
            <h1>{company.name}</h1>
            <p style={{ fontSize: 12, color: 'var(--ink4)' }}>
              /{company.slug} · {company.subscription_plan} plan · {company.live_employee_count || 0} employees
            </p>
          </div>
          <div className="ph-r">
            <button className="btn btn-sec" onClick={() => setAddUserOpen(true)}>+ Add User</button>
            <button className="btn btn-pri" onClick={() => setAddEmpOpen(true)}>+ Add Employee</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 3, marginBottom: 20, width: 'fit-content' }}>
          {(['employees', 'users'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '6px 18px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: tab === t ? 'var(--surface)' : 'transparent', color: tab === t ? 'var(--ink)' : 'var(--ink4)', boxShadow: tab === t ? 'var(--sh)' : 'none', textTransform: 'capitalize' }}>
              {t} {t === 'employees' ? `(${employees.length})` : `(${users.length})`}
            </button>
          ))}
        </div>

        {/* ── Employees Tab ──────────────────────────────── */}
        {tab === 'employees' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', overflow: 'hidden', boxShadow: 'var(--sh)' }}>
            {employees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink4)' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>👥</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No employees yet</div>
                <div style={{ fontSize: 12, marginBottom: 16 }}>Add employees directly, or create a user first and convert them to employee.</div>
                <button className="btn btn-pri btn-sm" onClick={() => setAddEmpOpen(true)}>+ Add First Employee</button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    {['Employee', 'Code', 'Department', 'Designation', 'Joined', 'Login', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink4)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(employees as CompanyEmployee[]).map(emp => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Av name={emp.full_name} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{emp.full_name}</div>
                            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--blue)' }}>{emp.employee_code}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink3)' }}>{emp.department?.name || '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink3)' }}>{emp.designation?.name || '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink4)' }}>{formatDate(emp.date_of_joining)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {emp.has_login
                          ? <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--green)', background: 'var(--green-lt)', border: '1px solid var(--green-bd)', borderRadius: 99, padding: '2px 8px' }}>✓ Active</span>
                          : <button className="btn btn-sec btn-sm" style={{ fontSize: 10 }}
                              onClick={() => { const pwd = window.prompt(`Set temporary password for ${emp.full_name}:`); if (pwd) createLoginMutation.mutate({ empId: emp.id, password: pwd }); }}>
                              + Add Login
                            </button>
                        }
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {emp.role && (
                          <span style={{ fontSize: 10, background: 'var(--blue-lt)', color: 'var(--blue)', border: '1px solid var(--blue-md)', borderRadius: 99, padding: '2px 8px' }}>{emp.role.name}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Users Tab ──────────────────────────────────── */}
        {tab === 'users' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', overflow: 'hidden', boxShadow: 'var(--sh)' }}>
            {users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink4)' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🔑</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No login users yet</div>
                <button className="btn btn-pri btn-sm" onClick={() => setAddUserOpen(true)}>+ Add User</button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    {['User', 'Role', 'Employee Record', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink4)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(users as CompanyUser[]).map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Av name={user.full_name || user.email} size={32} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{user.full_name || '(no name)'}</div>
                            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {user.role && (
                          <span style={{ fontSize: 10, background: 'var(--surface2)', color: 'var(--ink3)', border: '1px solid var(--border)', borderRadius: 99, padding: '2px 8px' }}>{user.role.name}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {user.has_employee_record
                          ? <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--green)', background: 'var(--green-lt)', border: '1px solid var(--green-bd)', borderRadius: 99, padding: '2px 8px' }}>
                              ✓ {user.employee?.employee_code}
                            </span>
                          : <span style={{ fontSize: 10, color: 'var(--amber)', background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 99, padding: '2px 8px' }}>
                              ⚠ No employee record
                            </span>
                        }
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: user.is_active ? 'var(--green)' : 'var(--red)', background: user.is_active ? 'var(--green-lt)' : 'var(--red-lt)', border: `1px solid ${user.is_active ? 'var(--green-bd)' : 'var(--red-bd)'}`, borderRadius: 99, padding: '2px 8px' }}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {!user.has_employee_record && user.is_active && (
                          <button className="btn btn-pri btn-sm" style={{ fontSize: 10, padding: '3px 10px' }}
                            onClick={() => setConvertUser(user)}>
                            Convert to Employee →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddUserModal    open={addUserOpen}  companyId={cId} roles={roles}  onClose={() => setAddUserOpen(false)} />
      <AddEmployeeModal open={addEmpOpen}  companyId={cId} roles={roles} departments={departments} designations={designations} onClose={() => setAddEmpOpen(false)} />
      <ConvertModal    open={!!convertUser} user={convertUser} companyId={cId} departments={departments} designations={designations} onClose={() => setConvertUser(null)} />
    </AppShell>
  );
}
