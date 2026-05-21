'use client';
import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { useAppDispatch }      from '../../../store';
import { setPageTitle }        from '../../../store/slices/uiSlice';
import { AppShell }            from '../../../layouts/AppLayout';
import { StatCard }            from '../../../components/ui/StatCard';
import { Chip }                from '../../../components/ui/Chip';
import { Modal }               from '../../../components/ui/Modal';
import { DepartmentFormModal } from '../../../features/departments/components/DepartmentFormModal';
import { useDepartments, useDepartmentStats, useDeleteDepartment } from '../../../features/departments/hooks/useDepartments';
import { usePermission }       from '../../../features/auth/hooks/usePermission';
import { useDebounce }         from '../../../hooks/useDebounce';
import { useEmployees }        from '../../../features/employees/hooks/useEmployees';
import type { Department }     from '../../../services/api/department.service';
import { getInitials }         from '../../../utils/formatters';

export default function DepartmentsPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const { canManageEmployees } = usePermission();

  const [search,       setSearch]       = useState('');
  const [formOpen,     setFormOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [viewMode,     setViewMode]     = useState<'cards' | 'table'>('cards');

  const debouncedSearch = useDebounce(search, 350);
  const deleteMutation  = useDeleteDepartment();

  const { data: departments = [], isLoading } = useDepartments({
    search: debouncedSearch || undefined,
  });
  console.log(departments)
  const { data: stats } = useDepartmentStats();
  const { data: empData } = useEmployees({ limit: 200 });
  const employees = empData?.data ?? [];

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Departments', breadcrumb: 'Organisation' }));
  }, [dispatch]);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit   = (d: Department) => { setEditTarget(d); setFormOpen(true); };

  const deptOptions  = departments.map((d) => ({ value: d.id, label: d.name }));
  const managerOpts  = employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }));

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <AppShell onAddNew={canManageEmployees ? openCreate : undefined}>
      <div className="pg-enter">

        {/* Header */}
        <div className="ph">
          <div>
            <h1>Departments</h1>
            <p>Organisational structure · Sub-department hierarchy · Head assignments</p>
          </div>
          <div className="ph-r">
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 2, gap: 2 }}>
              {(['cards', 'table'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  style={{
                    padding: '4px 12px', border: 'none', borderRadius: 6,
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: viewMode === v ? 'var(--surface)' : 'transparent',
                    color: viewMode === v ? 'var(--ink)' : 'var(--ink4)',
                    boxShadow: viewMode === v ? 'var(--sh)' : 'none',
                    fontFamily: 'var(--font)',
                  }}
                >
                  {v === 'cards' ? '⊞ Cards' : '☰ Table'}
                </button>
              ))}
            </div>
            {canManageEmployees && (
              <button className="btn btn-pri btn-sm" onClick={openCreate}>+ Add Department</button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="g4 mb14">
          <StatCard label="Total" value={stats?.total     ?? '…'} color="var(--blue)"   />
          <StatCard label="Active" value={stats?.active    ?? '…'} color="var(--green)"  />
          <StatCard label="With Head" value={stats?.withHead  ?? '…'} color="var(--teal)"   />
          <StatCard label="Without Head" value={stats?.withoutHead ?? '…'} color="var(--amber)" />
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
          <div className="search-bar" style={{ maxWidth: 300 }}>
            <span style={{ color: 'var(--ink4)' }}>⌕</span>
            <input
              type="text"
              placeholder="Search department name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ─── CARDS VIEW ─── */}
        {viewMode === 'cards' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card cp">
                    <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 10 }} />
                    <div className="skeleton" style={{ height: 12, width: '40%' }} />
                  </div>
                ))
              : departments.length === 0
              ? (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: 'var(--ink4)' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No departments yet</div>
                    <div style={{ fontSize: 12 }}>Create your first department to start organising your team</div>
                    {canManageEmployees && (
                      <button className="btn btn-pri btn-sm" style={{ marginTop: 16 }} onClick={openCreate}>
                        + Add Department
                      </button>
                    )}
                  </div>
                )
              : departments.map((dept) => (
                  <div key={dept.id} className="card" style={{ overflow: 'hidden' }}>
                    {/* Colour top bar */}
                    <div style={{ height: 4, background: dept.is_active ? 'var(--blue)' : 'var(--border2)' }} />

                    <div className="cp">
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.2px' }}>
                            {dept.name}
                          </div>
                          {dept.code && (
                            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', color: 'var(--ink4)', marginTop: 3, display: 'inline-block' }}>
                              {dept.code}
                            </span>
                          )}
                        </div>
                        <Chip variant={dept.is_active ? 'green' : 'gray'}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </Chip>
                      </div>

                      {/* Head */}
                      {dept.head ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 'var(--r)' }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue), var(--purple))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                            {getInitials(`${dept.head.first_name} ${dept.head.last_name}`)}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>
                              {dept.head.first_name} {dept.head.last_name}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Department Head</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--ink4)', fontStyle: 'italic', marginBottom: 12, padding: '6px 10px', background: 'var(--amber-lt)', borderRadius: 'var(--r)', border: '1px solid var(--amber-bd)' }}>
                          ⚠ No head assigned
                        </div>
                      )}

                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--blue)' }}>
                            {dept.employee_count ?? 0}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Employees</div>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--teal)' }}>
                            {dept.designations?.length ?? 0}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Designations</div>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--purple)' }}>
                            {dept.children?.length ?? 0}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Sub-depts</div>
                        </div>
                      </div>

                      {/* Parent */}
                      {dept.parent && (
                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 12 }}>
                          Under: <strong style={{ color: 'var(--ink3)' }}>{dept.parent.name}</strong>
                        </div>
                      )}

                      {/* Actions */}
                      {canManageEmployees && (
                        <div style={{ display: 'flex', gap: 6, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                          <Chip variant="blue"  onClick={() => router.push(`/departments/${dept.id}`)}>View</Chip>
                          <Chip variant="gray"  onClick={() => openEdit(dept)}>Edit</Chip>
                          <Chip variant="red"   onClick={() => setDeleteTarget(dept)}>Delete</Chip>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
          </div>
        )}

        {/* ─── TABLE VIEW ─── */}
        {viewMode === 'table' && (
          <div className="card">
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Code</th>
                    <th>Head</th>
                    <th>Employees</th>
                    <th>Designations</th>
                    <th>Parent</th>
                    <th>Status</th>
                    {canManageEmployees && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j}><div className="skeleton" style={{ height: 14, width: 80 }} /></td>
                          ))}
                        </tr>
                      ))
                    : departments.map((dept) => (
                        <tr key={dept.id}>
                          <td>
                            <strong style={{ cursor: 'pointer', color: 'var(--blue)' }}
                              onClick={() => router.push(`/departments/${dept.id}`)}>
                              {dept.name}
                            </strong>
                          </td>
                          <td>
                            {dept.code
                              ? <span style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px' }}>{dept.code}</span>
                              : <span style={{ color: 'var(--ink4)' }}>—</span>}
                          </td>
                          <td>
                            {dept.head
                              ? <span style={{ fontSize: 12 }}>{dept.head.first_name} {dept.head.last_name}</span>
                              : <Chip variant="amber">Unassigned</Chip>}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--blue)' }}>
                            {dept.employee_count ?? 0}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)' }}>{dept.designations?.length ?? 0}</td>
                          <td style={{ fontSize: 11, color: 'var(--ink4)' }}>
                            {dept.parent?.name ?? '—'}
                          </td>
                          <td><Chip variant={dept.is_active ? 'green' : 'gray'}>{dept.is_active ? 'Active' : 'Inactive'}</Chip></td>
                          {canManageEmployees && (
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <Chip variant="gray" onClick={() => openEdit(dept)}>Edit</Chip>
                                <Chip variant="red"  onClick={() => setDeleteTarget(dept)}>Delete</Chip>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Create / Edit modal */}
      <DepartmentFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        department={editTarget}
        departments={deptOptions}
        managers={managerOpts}
      />

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Department"
        subtitle={`Delete "${deleteTarget?.name}"?`}
        footer={
          <>
            <button className="btn btn-sec" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </>
        }
      >
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)' }}>
          ⚠ Departments with active employees or sub-departments cannot be deleted.
          Reassign them first.
        </div>
      </Modal>
    </AppShell>
  );
}
