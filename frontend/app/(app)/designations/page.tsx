'use client';
import { useEffect, useState } from 'react';
import { useAppDispatch }      from '../../../store';
import { setPageTitle }        from '../../../store/slices/uiSlice';
import { AppShell }            from '../../../layouts/AppLayout';
import { DataTable, Column }   from '../../../components/ui/DataTable';
import { Chip }                from '../../../components/ui/Chip';
import { Modal }               from '../../../components/ui/Modal';
import { StatCard }            from '../../../components/ui/StatCard';
import { useDesignations, useDeleteDesignation } from '../../../features/designations/hooks/useDesignations';
import { DesignationFormModal } from '../../../features/designations/components/DesignationFormModal';
import { usePermission }       from '../../../features/auth/hooks/usePermission';
import { useDesignationsByDepartment } from '../../../features/designations/hooks/useDesignations';
import type { Designation }    from '../../../features/designations/types/designation.types';
import { useQuery }            from '@tanstack/react-query';
import { departmentService }   from '../../../services/api/department.service';
import { useDebounce }         from '../../../hooks/useDebounce';

export default function DesignationsPage() {
  const dispatch = useAppDispatch();
  const { canManageEmployees } = usePermission();

  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState<number | ''>('');
  const [formOpen,     setFormOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<Designation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);

  const debouncedSearch = useDebounce(search, 350);
  const deleteMutation  = useDeleteDesignation();

  const { data: designations = [], isLoading } = useDesignations({
    search:        debouncedSearch || undefined,
    department_id: deptFilter || undefined,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn:  () => departmentService.getAll(),
    staleTime: 5 * 60_000,
    select:    (res) => res.data,
  });

  const departmentOptions = departments.map((d: any) => ({ value: d.id, label: d.name }));

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

  // ─── Summary stats ───────────────────────────────────────────────────────
  const total        = designations.length;
  const withGrade    = designations.filter((d) => d.grade).length;
  const withDept     = designations.filter((d) => d.department_id).length;
  const crossFunc    = designations.filter((d) => !d.department_id).length;

  const columns: Column<Designation>[] = [
    {
      key: 'name', header: 'Designation',
      render: (row) => (
        <div>
          <strong style={{ color: 'var(--ink)' }}>{row.name}</strong>
          {row.grade && (
            <span style={{
              marginLeft: 8, fontSize: 10, fontFamily: 'var(--mono)',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '1px 6px', color: 'var(--ink4)',
            }}>
              {row.grade}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'department', header: 'Department',
      render: (row) =>
        row.department
          ? <Chip variant="blue">{row.department.name}</Chip>
          : <span style={{ fontSize: 11, color: 'var(--ink4)', fontStyle: 'italic' }}>Cross-functional</span>,
    },
    {
      key: 'employees', header: 'Active Employees',
      render: (row) => {
        const count = row.employees?.length ?? 0;
        return (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: count > 0 ? 'var(--blue)' : 'var(--ink4)' }}>
            {count}
          </span>
        );
      },
    },
    {
      key: 'is_active', header: 'Status',
      render: (row) =>
        row.is_active
          ? <Chip variant="green">Active</Chip>
          : <Chip variant="gray">Inactive</Chip>,
    },
    {
      key: 'actions', header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {canManageEmployees && (
            <>
              <Chip variant="gray" onClick={() => openEdit(row)}>Edit</Chip>
              <Chip variant="red"  onClick={() => setDeleteTarget(row)}>Delete</Chip>
            </>
          )}
        </div>
      ),
    },
  ];

  const toolbar = (
    <>
      <div style={{ fontSize: 13, fontWeight: 700 }}>
        All Designations
        <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 400, marginLeft: 6 }}>
          {total} total
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font)', outline: 'none' }}
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">All Departments</option>
          {departmentOptions.map((d: any) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <div className="search-bar">
          <span style={{ color: 'var(--ink4)' }}>⌕</span>
          <input
            type="text"
            placeholder="Search designation or grade…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
    </>
  );

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
            {canManageEmployees && (
              <button className="btn btn-pri btn-sm" onClick={openCreate}>
                + Add Designation
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="g4 mb14">
          <StatCard label="Total"          value={total}     color="var(--blue)"   />
          <StatCard label="With Grade"     value={withGrade} color="var(--teal)"   />
          <StatCard label="Dept-specific"  value={withDept}  color="var(--purple)" />
          <StatCard label="Cross-function" value={crossFunc} color="var(--amber)"  />
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={designations}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          toolbar={toolbar}
          emptyText="No designations found. Add your first designation to get started."
        />
      </div>

      {/* Create / Edit modal */}
      <DesignationFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        designation={editTarget}
        departments={departmentOptions}
      />

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Designation"
        subtitle={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        footer={
          <>
            <button className="btn btn-sec" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </>
        }
      >
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)' }}>
          ⚠ This action cannot be undone. If employees are assigned to this designation,
          the deletion will be blocked — reassign them first.
        </div>
      </Modal>
    </AppShell>
  );
}
