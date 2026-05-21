'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery }             from '@tanstack/react-query';
import { useAppDispatch }       from '../../../../store';
import { setPageTitle }         from '../../../../store/slices/uiSlice';
import { AppShell }             from '../../../../layouts/AppLayout';
import { Chip }                 from '../../../../components/ui/Chip';
import { Modal }                from '../../../../components/ui/Modal';
import { DesignationFormModal } from '../../../../features/designations/components/DesignationFormModal';
import {
  useDesignation, useDeleteDesignation, useToggleDesignation,
} from '../../../../features/designations/hooks/useDesignations';
import { usePermission }        from '../../../../features/auth/hooks/usePermission';
import { departmentService }    from '../../../../services/api/department.service';
import { getInitials }          from '../../../../utils/formatters';

export default function DesignationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const id = parseInt(params.id as string, 10);
  const { canManageEmployees } = usePermission();

  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: designation, isLoading, isError } = useDesignation(id);
  const deleteMutation = useDeleteDesignation();
  const toggleMutation = useToggleDesignation();

  const { data: deptsRes } = useQuery({
    queryKey: ['departments'],
    queryFn:  () => departmentService.getAll(),
    staleTime: 5 * 60_000,
    select:    (res) => res.data,
  });
  const deptOptions = (deptsRes || []).map((d: any) => ({ value: d.id, label: d.name }));

  useEffect(() => {
    if (designation) dispatch(setPageTitle({ title: designation.name, breadcrumb: 'Designations' }));
  }, [designation, dispatch]);

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    router.push('/designations');
  };

  // Grade colour logic
  const gradeColor = (grade: string | null | undefined) => {
    if (!grade) return 'gray';
    const u = grade.toUpperCase();
    if (u.startsWith('L')) return 'blue';
    if (u.startsWith('M')) return 'purple';
    if (u.includes('SENIOR') || u.includes('LEAD')) return 'teal';
    return 'amber';
  };

  if (isLoading) {
    return (
      <AppShell>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)', fontSize: 13 }}>
          Loading designation…
        </div>
      </AppShell>
    );
  }

  if (isError || !designation) {
    return (
      <AppShell>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>Designation not found</div>
          <button className="btn btn-sec btn-sm" onClick={() => router.push('/designations')}>
            ← Back to Designations
          </button>
        </div>
      </AppShell>
    );
  }

  const employeeCount = designation.employees?.length ?? 0;

  return (
    <AppShell>
      <div className="pg-enter">

        {/* Header */}
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Icon */}
            <div style={{
              width: 52, height: 52, borderRadius: 13,
              background: designation.is_active
                ? 'linear-gradient(135deg, var(--blue), var(--purple))'
                : 'var(--surface3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: designation.is_active ? '#fff' : 'var(--ink4)',
              fontSize: 20, fontWeight: 700, flexShrink: 0,
            }}>
              🎯
            </div>
            <div>
              <h1 style={{ marginBottom: 6 }}>{designation.name}</h1>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {designation.grade && (
                  <Chip variant={gradeColor(designation.grade) as any}>{designation.grade}</Chip>
                )}
                <Chip variant={designation.is_active ? 'green' : 'gray'}>
                  {designation.is_active ? 'Active' : 'Inactive'}
                </Chip>
                {designation.department && (
                  <span
                    style={{ fontSize: 11, color: 'var(--blue)', cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => router.push(`/departments/${designation.department!.id}`)}
                  >
                    {designation.department.name} →
                  </span>
                )}
                {!designation.department && (
                  <span style={{ fontSize: 11, color: 'var(--ink4)', fontStyle: 'italic' }}>Cross-functional</span>
                )}
              </div>
            </div>
          </div>

          <div className="ph-r">
            <button className="btn btn-sec btn-sm" onClick={() => router.push('/designations')}>← Back</button>
            {canManageEmployees && (
              <>
                <button
                  className="btn btn-sec btn-sm"
                  onClick={() => toggleMutation.mutate(id)}
                  disabled={toggleMutation.isPending}
                >
                  {designation.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn btn-sec btn-sm" onClick={() => setEditOpen(true)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>Delete</button>
              </>
            )}
          </div>
        </div>

        <div className="g2">
          {/* Left column — details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Overview */}
            <div className="card cp">
              <div className="ct">Designation Details</div>
              {[
                { label: 'Name',           value: designation.name },
                { label: 'Grade / Level',  value: designation.grade
                    ? <Chip variant={gradeColor(designation.grade) as any}>{designation.grade}</Chip>
                    : <span style={{ color: 'var(--ink4)' }}>Not assigned</span> },
                { label: 'Department',     value: designation.department
                    ? <span style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => router.push(`/departments/${designation.department!.id}`)}>
                        {designation.department.name}
                        {designation.department.code && ` (${designation.department.code})`}
                      </span>
                    : <span style={{ color: 'var(--ink4)', fontStyle: 'italic' }}>Cross-functional</span> },
                { label: 'Status',         value: <Chip variant={designation.is_active ? 'green' : 'gray'}>{designation.is_active ? 'Active' : 'Inactive'}</Chip> },
                { label: 'Active Employees', value: <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: employeeCount > 0 ? 'var(--blue)' : 'var(--ink4)', fontSize: 14 }}>{employeeCount}</span> },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--ink4)', fontWeight: 500 }}>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            {canManageEmployees && (
              <div className="card cp">
                <div className="ct">Actions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="btn btn-sec" style={{ justifyContent: 'flex-start' }} onClick={() => setEditOpen(true)}>
                    ✏️ Edit designation
                  </button>
                  <button
                    className="btn btn-sec"
                    style={{ justifyContent: 'flex-start', color: designation.is_active ? 'var(--amber)' : 'var(--green)', borderColor: designation.is_active ? 'var(--amber-bd)' : 'var(--green-bd)' }}
                    onClick={() => toggleMutation.mutate(id)}
                    disabled={toggleMutation.isPending}
                  >
                    {designation.is_active ? '⏸ Deactivate designation' : '▶ Activate designation'}
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => setDeleteOpen(true)}
                    disabled={employeeCount > 0}
                    title={employeeCount > 0 ? `Cannot delete — ${employeeCount} employees are assigned` : ''}
                  >
                    🗑 Delete designation
                    {employeeCount > 0 && <span style={{ marginLeft: 6, fontSize: 10, opacity: .7 }}>(reassign employees first)</span>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right column — employees */}
          <div className="card">
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                Employees with this designation
                <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 400, marginLeft: 6 }}>
                  {employeeCount} active
                </span>
              </div>
              <button
                className="btn btn-sec btn-sm"
                onClick={() => router.push(`/employees?designation_id=${id}`)}
              >
                View all →
              </button>
            </div>

            {employeeCount > 0 ? (
              designation.employees!.map((emp) => (
                <div
                  key={emp.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .1s' }}
                  onClick={() => router.push(`/employees/${emp.id}`)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--blue), var(--purple))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(`${emp.first_name} ${emp.last_name}`)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {emp.first_name} {emp.last_name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{emp.employee_code}</div>
                  </div>
                  <Chip variant={emp.status === 'Active' ? 'green' : 'amber'}>{emp.status}</Chip>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink4)' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>👥</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>No employees yet</div>
                <div style={{ fontSize: 12 }}>Employees will appear here when assigned this designation</div>
                <button
                  className="btn btn-sec btn-sm"
                  style={{ marginTop: 14 }}
                  onClick={() => router.push('/employees')}
                >
                  Go to Employees →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <DesignationFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        designation={designation}
        departments={deptOptions}
      />

      {/* Delete confirmation */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Designation"
        subtitle={`Delete "${designation.name}"? This cannot be undone.`}
        footer={
          <>
            <button className="btn btn-sec" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleteMutation.isPending || employeeCount > 0}>
              {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </>
        }
      >
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)' }}>
          {employeeCount > 0
            ? `⚠ Cannot delete — ${employeeCount} employee(s) currently hold this designation. Reassign them first.`
            : '⚠ This action permanently removes the designation from the system.'}
        </div>
      </Modal>
    </AppShell>
  );
}
