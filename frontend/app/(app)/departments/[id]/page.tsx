'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch }       from '../../../../store';
import { setPageTitle }         from '../../../../store/slices/uiSlice';
import { AppShell }             from '../../../../layouts/AppLayout';
import { Chip }                 from '../../../../components/ui/Chip';
import { Modal }                from '../../../../components/ui/Modal';
import { DepartmentFormModal }  from '../../../../features/departments/components/DepartmentFormModal';
import { useDepartment, useDeleteDepartment } from '../../../../features/departments/hooks/useDepartments';
import { useDepartments }       from '../../../../features/departments/hooks/useDepartments';
import { useEmployees }         from '../../../../features/employees/hooks/useEmployees';
import { usePermission }        from '../../../../features/auth/hooks/usePermission';
import { formatDate, getInitials } from '../../../../utils/formatters';

export default function DepartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const id = parseInt(params.id as string, 10);
  const { canManageEmployees } = usePermission();

  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: dept, isLoading, isError } = useDepartment(id);
  const { data: departments = [] } = useDepartments();
  const { data: empData } = useEmployees({ limit: 200 });
  const deleteMutation = useDeleteDepartment();

  const employees  = empData?.data ?? [];
  const deptOpts   = departments.filter((d) => d.id !== id).map((d) => ({ value: d.id, label: d.name }));
  const managerOpts = employees.map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }));

  useEffect(() => {
    if (dept) dispatch(setPageTitle({ title: dept.name, breadcrumb: 'Departments' }));
  }, [dept, dispatch]);

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    router.push('/departments');
  };

  if (isLoading) {
    return (
      <AppShell>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)', fontSize: 13 }}>Loading department…</div>
      </AppShell>
    );
  }

  if (isError || !dept) {
    return (
      <AppShell>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>Department not found</div>
          <button className="btn btn-sec btn-sm" onClick={() => router.push('/departments')}>← Back to Departments</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pg-enter">

        {/* Page header */}
        <div className="ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, var(--blue), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
              {(dept.code?.[0] || dept.name[0]).toUpperCase()}
            </div>
            <div>
              <h1 style={{ marginBottom: 4 }}>{dept.name}</h1>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {dept.code && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px' }}>{dept.code}</span>
                )}
                <Chip variant={dept.is_active ? 'green' : 'gray'}>{dept.is_active ? 'Active' : 'Inactive'}</Chip>
                {dept.parent && (
                  <span style={{ fontSize: 11, color: 'var(--ink4)' }}>
                    Sub-dept of <strong style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => router.push(`/departments/${dept.parent!.id}`)}>{dept.parent.name}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="ph-r">
            <button className="btn btn-sec btn-sm" onClick={() => router.push('/departments')}>← Back</button>
            {canManageEmployees && (
              <>
                <button className="btn btn-sec btn-sm" onClick={() => setEditOpen(true)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>Delete</button>
              </>
            )}
          </div>
        </div>

        <div className="g2">
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Overview card */}
            <div className="card cp">
              <div className="ct">Overview</div>
              {[
                { label: 'Department Name', value: dept.name },
                { label: 'Code',            value: dept.code || '—' },
                { label: 'Status',          value: <Chip variant={dept.is_active ? 'green' : 'gray'}>{dept.is_active ? 'Active' : 'Inactive'}</Chip> },
                { label: 'Parent',          value: dept.parent ? dept.parent.name : 'Top-level department' },
                { label: 'Employees',       value: String(dept.employee_count ?? dept.employees?.length ?? 0) },
                { label: 'Designations',    value: String(dept.designations?.length ?? 0) },
                { label: 'Sub-departments', value: String(dept.children?.length ?? 0) },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--ink4)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Department Head */}
            <div className="card cp">
              <div className="ct">Department Head</div>
              {dept.head ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--blue), var(--purple))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(`${dept.head.first_name} ${dept.head.last_name}`)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                      {dept.head.first_name} {dept.head.last_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Department Head</div>
                  </div>
                  <button
                    className="btn btn-sec btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => router.push(`/employees/${dept.head!.id}`)}
                  >
                    View Profile
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink4)' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>👤</div>
                  <div style={{ fontSize: 12 }}>No head assigned yet</div>
                  {canManageEmployees && (
                    <button className="btn btn-sec btn-sm" style={{ marginTop: 12 }} onClick={() => setEditOpen(true)}>
                      Assign Head
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Designations */}
            {(dept.designations?.length ?? 0) > 0 && (
              <div className="card cp">
                <div className="ct">Designations</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {dept.designations!.map((d) => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '5px 10px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{d.name}</span>
                      {d.grade && <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink4)' }}>{d.grade}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-departments */}
            {(dept.children?.length ?? 0) > 0 && (
              <div className="card cp">
                <div className="ct">Sub-departments</div>
                {dept.children!.map((child) => (
                  <div
                    key={child.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => router.push(`/departments/${child.id}`)}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--blue)' }}>
                      {(child.code?.[0] || child.name[0]).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', flex: 1 }}>{child.name}</span>
                    {child.code && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink4)' }}>{child.code}</span>}
                    <span style={{ color: 'var(--ink4)', fontSize: 12 }}>→</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column — employees */}
          <div className="card">
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                Team Members
                <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 400, marginLeft: 6 }}>
                  {dept.employees?.length ?? 0} active
                </span>
              </div>
              <button className="btn btn-sec btn-sm" onClick={() => router.push(`/employees?department_id=${id}`)}>
                View all →
              </button>
            </div>
            {dept.employees && dept.employees.length > 0 ? (
              dept.employees.map((emp) => (
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
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink4)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
                <div style={{ fontSize: 12 }}>No active employees in this department</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <DepartmentFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        department={dept}
        departments={deptOpts}
        managers={managerOpts}
      />

      {/* Delete confirmation */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Department"
        subtitle={`Delete "${dept.name}"? This cannot be undone.`}
        footer={
          <>
            <button className="btn btn-sec" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </>
        }
      >
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)' }}>
          ⚠ Active employees or sub-departments block deletion. Reassign them first.
        </div>
      </Modal>
    </AppShell>
  );
}
