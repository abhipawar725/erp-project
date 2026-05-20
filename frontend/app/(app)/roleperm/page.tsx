'use client';
import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../../store';
import { setPageTitle } from '../../../store/slices/uiSlice';
import { AppShell } from '../../../layouts/AppLayout';
import { Chip } from '../../../components/ui/Chip';

const ROLES = [
  { id: 'hr', name: 'HR Manager', color: 'var(--blue)', members: 3, modules: 22, description: 'Full access to all HR modules' },
  { id: 'admin', name: 'Admin', color: 'var(--purple)', members: 2, modules: 22, description: 'System administration and settings' },
  { id: 'mgr', name: 'Department Manager', color: 'var(--teal)', members: 18, modules: 12, description: 'Team management and approvals' },
  { id: 'emp', name: 'Employee', color: 'var(--green)', members: 261, modules: 6, description: 'Self-service portal access' },
];

const MODULES = [
  'Dashboard', 'Employees', 'Attendance', 'Leave Management', 'Payroll',
  'Recruitment (ATS)', 'Onboarding', 'Exit & FNF', 'Assets', 'KRA/KPI',
  'Tasks', 'Analytics', 'Compliance', 'Roles & Permissions', 'Settings',
  'Template Management',
];

const PERMISSIONS = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Export'];

// Default permission matrix
const DEFAULT_MATRIX: Record<string, Record<string, Record<string, boolean>>> = {
  hr: Object.fromEntries(MODULES.map((m) => [m, Object.fromEntries(PERMISSIONS.map((p) => [p, true]))])),
  admin: Object.fromEntries(MODULES.map((m) => [m, Object.fromEntries(PERMISSIONS.map((p) => [p, true]))])),
  mgr: Object.fromEntries(MODULES.map((m) => [m, {
    View: true, Create: m === 'Leave Management' || m === 'Tasks',
    Edit: m === 'Attendance', Delete: false,
    Approve: m === 'Leave Management' || m === 'Attendance',
    Export: m === 'Analytics',
  }])),
  emp: Object.fromEntries(MODULES.map((m) => [m, {
    View: ['Dashboard', 'Attendance', 'Leave Management', 'Assets', 'Tasks', 'KRA/KPI'].includes(m),
    Create: m === 'Leave Management',
    Edit: false, Delete: false, Approve: false, Export: false,
  }])),
};

export default function RolePermPage() {
  const dispatch = useAppDispatch();
  const [selectedRole, setSelectedRole] = useState('hr');
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX);
  const [activeTab, setActiveTab] = useState<'module' | 'field'>('module');

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Roles & Permissions', breadcrumb: 'Intelligence' }));
  }, [dispatch]);

  const togglePerm = (module: string, perm: string) => {
    setMatrix((prev) => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [module]: {
          ...prev[selectedRole][module],
          [perm]: !prev[selectedRole][module][perm],
        },
      },
    }));
  };

  const grantAll = () => {
    setMatrix((prev) => ({
      ...prev,
      [selectedRole]: Object.fromEntries(
        MODULES.map((m) => [m, Object.fromEntries(PERMISSIONS.map((p) => [p, true]))])
      ),
    }));
  };

  const revokeAll = () => {
    setMatrix((prev) => ({
      ...prev,
      [selectedRole]: Object.fromEntries(
        MODULES.map((m) => [m, Object.fromEntries(PERMISSIONS.map((p) => [p, false]))])
      ),
    }));
  };

  const roleData = ROLES.find((r) => r.id === selectedRole)!;
  const roleMatrix = matrix[selectedRole] || {};

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Roles &amp; Permissions</h1>
            <p>Granular RBAC · Module &amp; field-level access control · 4 roles configured</p>
          </div>
          <div className="ph-r">
            <button className="btn btn-sec btn-sm">+ New Role</button>
            <button className="btn btn-pri btn-sm">✓ Save Changes</button>
          </div>
        </div>

        {/* Role cards */}
        <div className="g4 mb14">
          {ROLES.map((role) => (
            <div
              key={role.id}
              className={`card cp`}
              style={{
                cursor: 'pointer',
                borderColor: selectedRole === role.id ? role.color : undefined,
                borderWidth: selectedRole === role.id ? 2 : 1,
              }}
              onClick={() => setSelectedRole(role.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: role.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}
                >
                  {role.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{role.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{role.members} members</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 8 }}>{role.description}</div>
              <div style={{ display: 'flex', gap: 5 }}>
                <Chip variant="blue">{role.modules} modules</Chip>
              </div>
            </div>
          ))}
        </div>

        {/* Permission matrix */}
        <div className="card">
          {/* Matrix header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                Permissions — {roleData.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>
                Click toggles to grant or revoke permissions
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ok btn-sm" onClick={grantAll}>✓ Grant All</button>
              <button className="btn btn-danger btn-sm" onClick={revokeAll}>✕ Revoke All</button>
            </div>
          </div>

          {/* Matrix table */}
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 200 }}>Module</th>
                  {PERMISSIONS.map((p) => <th key={p} style={{ textAlign: 'center' }}>{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => (
                  <tr key={mod}>
                    <td><strong>{mod}</strong></td>
                    {PERMISSIONS.map((perm) => {
                      const granted = roleMatrix[mod]?.[perm] ?? false;
                      return (
                        <td key={perm} style={{ textAlign: 'center' }}>
                          <div
                            onClick={() => togglePerm(mod, perm)}
                            style={{
                              width: 22, height: 22, borderRadius: 4, margin: '0 auto',
                              border: `1.5px solid ${granted ? 'var(--blue)' : 'var(--border2)'}`,
                              background: granted ? 'var(--blue)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: 11, color: '#fff',
                              transition: 'all .12s',
                            }}
                          >
                            {granted ? '✓' : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}