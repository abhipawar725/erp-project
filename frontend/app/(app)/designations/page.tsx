'use client';
import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { useQuery }            from '@tanstack/react-query';
import { useAppDispatch }      from '../../../store';
import { setPageTitle }        from '../../../store/slices/uiSlice';
import { AppShell }            from '../../../layouts/AppLayout';
import { StatCard }            from '../../../components/ui/StatCard';
import { Chip }                from '../../../components/ui/Chip';
import { Modal }               from '../../../components/ui/Modal';
import { DesignationFormModal } from '../../../features/designations/components/DesignationFormModal';
import {
  useDesignations, useDesignationStats,
  useDeleteDesignation, useToggleDesignation,
} from '../../../features/designations/hooks/useDesignations';
import { usePermission }       from '../../../features/auth/hooks/usePermission';
import { useDebounce }         from '../../../hooks/useDebounce';
import { departmentService }   from '../../../services/api/department.service';
import type { Designation }    from '../../../features/designations/types/designation.types';

export default function DesignationsPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const { canManageEmployees } = usePermission();

  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<'true' | 'false' | 'all'>('true');
  const [viewMode,     setViewMode]     = useState<'cards' | 'table'>('table');
  const [formOpen,     setFormOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<Designation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);

  const debouncedSearch = useDebounce(search, 350);
  const deleteMutation  = useDeleteDesignation();
  const toggleMutation  = useToggleDesignation();

  const { data: designations = [], isLoading } = useDesignations({
    search:        debouncedSearch || undefined,
    department_id: deptFilter || undefined,
    is_active:     statusFilter,
  });

  const { data: stats } = useDesignationStats();

  const { data: deptsRes } = useQuery({
    queryKey: ['departments'],
    queryFn:  () => departmentService.getAll(),
    staleTime: 5 * 60_000,
    select:    (res) => res.data,
  });
  const deptOptions = (deptsRes || []).map((d: any) => ({ value: d.id, label: d.name }));

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Designations', breadcrumb: 'Organisation' }));
  }, [dispatch]);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit   = (d: Designation) => { setEditTarget(d); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  // ─── Grade chip colours ───────────────────────────────────────────────────
  const gradeColor = (grade: string | null | undefined) => {
    if (!grade) return 'gray';
    const upper = grade.toUpperCase();
    if (upper.startsWith('L')) return 'blue';
    if (upper.startsWith('M')) return 'purple';
    if (upper.includes('SENIOR') || upper.includes('SR') || upper.includes('LEAD')) return 'teal';
    if (upper.includes('INTERN') || upper === 'L0' || upper === 'L1') return 'gray';
    return 'amber';
  };

  return (
    <AppShell onAddNew={canManageEmployees ? openCreate : undefined}>
      <div className="pg-enter">

        {/* Header */}
        <div className="ph">
          <div>
            <h1>Designations</h1>
            <p>Roles and levels across your organisation · Linked to departments and employees</p>
          </div>
          <div className="ph-r">
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 2, gap: 2 }}>
              {(['table', 'cards'] as const).map((v) => (
                <button key={v} onClick={() => setViewMode(v)} style={{ padding: '4px 12px', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: viewMode === v ? 'var(--surface)' : 'transparent', color: viewMode === v ? 'var(--ink)' : 'var(--ink4)', boxShadow: viewMode === v ? 'var(--sh)' : 'none', fontFamily: 'var(--font)', transition: 'all .1s' }}>
                  {v === 'table' ? '☰ Table' : '⊞ Cards'}
                </button>
              ))}
            </div>
            {canManageEmployees && (
              <button className="btn btn-pri btn-sm" onClick={openCreate}>+ Add Designation</button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="g4 mb14">
          <StatCard label="Total"           value={stats?.total           ?? '…'} color="var(--blue)"   />
          <StatCard label="Active"          value={stats?.active          ?? '…'} color="var(--green)"  />
          <StatCard label="With Grade"      value={stats?.withGrade       ?? '…'} color="var(--teal)"   />
          <StatCard label="Cross-functional" value={stats?.crossFunctional ?? '…'} color="var(--amber)" />
        </div>

        {/* Top designation banner */}
        {stats?.topDesignation && (
          <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '10px 16px', marginBottom: 16, fontSize: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>🏆</span>
            <span style={{ color: 'var(--ink3)' }}>
              Most populated designation: <strong style={{ color: 'var(--blue)' }}>{stats.topDesignation.name}</strong>
              <span style={{ marginLeft: 8, fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--blue)', color: '#fff', padding: '1px 8px', borderRadius: 99 }}>{stats.topDesignation.count} employees</span>
            </span>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ maxWidth: 280 }}>
            <span style={{ color: 'var(--ink4)' }}>⌕</span>
            <input type="text" placeholder="Search name or grade…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : '')}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font)', outline: 'none' }}
          >
            <option value="">All Departments</option>
            {deptOptions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font)', outline: 'none' }}
          >
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
            <option value="all">All</option>
          </select>
          <span style={{ fontSize: 11, color: 'var(--ink4)', alignSelf: 'center', marginLeft: 4 }}>
            {designations.length} result{designations.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ─── TABLE VIEW ─── */}
        {viewMode === 'table' && (
          <div className="card">
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Designation</th>
                    <th>Grade</th>
                    <th>Department</th>
                    <th>Employees</th>
                    <th>Status</th>
                    {canManageEmployees && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {[140, 60, 100, 40, 60, 80].map((w, j) => (
                            <td key={j}><div className="skeleton" style={{ height: 14, width: w }} /></td>
                          ))}
                        </tr>
                      ))
                    : designations.length === 0
                    ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--ink4)' }}>
                            No designations found. {canManageEmployees && <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={openCreate}>Create the first one →</span>}
                          </td>
                        </tr>
                      )
                    : designations.map((d) => (
                        <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/designations/${d.id}`)}>
                          <td>
                            <strong style={{ color: 'var(--ink)' }}>{d.name}</strong>
                          </td>
                          <td>
                            {d.grade
                              ? <Chip variant={gradeColor(d.grade) as any}>{d.grade}</Chip>
                              : <span style={{ color: 'var(--ink4)', fontSize: 11 }}>—</span>}
                          </td>
                          <td>
                            {d.department
                              ? <Chip variant="blue">{d.department.name}</Chip>
                              : <span style={{ fontSize: 11, color: 'var(--ink4)', fontStyle: 'italic' }}>Cross-functional</span>}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', fontWeight: 500, color: (d.employee_count ?? 0) > 0 ? 'var(--blue)' : 'var(--ink4)', textAlign: 'center' }}>
                            {d.employee_count ?? 0}
                          </td>
                          <td>
                            <Chip variant={d.is_active ? 'green' : 'gray'}>{d.is_active ? 'Active' : 'Inactive'}</Chip>
                          </td>
                          {canManageEmployees && (
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <Chip variant="gray"  onClick={() => openEdit(d)}>Edit</Chip>
                                <Chip variant={d.is_active ? 'amber' : 'green'} onClick={() => toggleMutation.mutate(d.id)}>
                                  {d.is_active ? 'Deactivate' : 'Activate'}
                                </Chip>
                                <Chip variant="red"   onClick={() => setDeleteTarget(d)}>Delete</Chip>
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

        {/* ─── CARDS VIEW ─── */}
        {viewMode === 'cards' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="card cp">
                    <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 12, width: '40%' }} />
                  </div>
                ))
              : designations.length === 0
              ? (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: 'var(--ink4)' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No designations found</div>
                    {canManageEmployees && (
                      <button className="btn btn-pri btn-sm" style={{ marginTop: 8 }} onClick={openCreate}>+ Add Designation</button>
                    )}
                  </div>
                )
              : designations.map((d) => (
                  <div
                    key={d.id}
                    className="card"
                    style={{ overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .12s' }}
                    onClick={() => router.push(`/designations/${d.id}`)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sh2)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sh)'; }}
                  >
                    <div style={{ height: 3, background: d.is_active ? 'var(--blue)' : 'var(--border2)' }} />
                    <div className="cp">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', flex: 1, marginRight: 8 }}>{d.name}</div>
                        {d.grade && <Chip variant={gradeColor(d.grade) as any}>{d.grade}</Chip>}
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        {d.department
                          ? <Chip variant="blue">{d.department.name}</Chip>
                          : <span style={{ fontSize: 10, color: 'var(--ink4)', fontStyle: 'italic' }}>Cross-functional</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink4)' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 500, color: (d.employee_count ?? 0) > 0 ? 'var(--blue)' : 'var(--ink4)' }}>
                          {d.employee_count ?? 0} employees
                        </span>
                        <Chip variant={d.is_active ? 'green' : 'gray'}>{d.is_active ? 'Active' : 'Inactive'}</Chip>
                      </div>
                      {canManageEmployees && (
                        <div style={{ display: 'flex', gap: 5, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
                          <Chip variant="gray" onClick={() => openEdit(d)}>Edit</Chip>
                          <Chip variant="red"  onClick={() => setDeleteTarget(d)}>Delete</Chip>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <DesignationFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        designation={editTarget}
        departments={deptOptions}
      />

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Designation"
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
          ⚠ If active employees hold this designation, deletion will be blocked. Reassign them first.
        </div>
      </Modal>
    </AppShell>
  );
}
