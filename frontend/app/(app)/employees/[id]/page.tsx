'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch } from '../../../../store';
import { setPageTitle } from '../../../../store/slices/uiSlice';
import { AppShell } from '../../../../layouts/AppLayout';
import { Chip, statusToVariant } from '../../../../components/ui/Chip';
import { Modal } from '../../../../components/ui/Modal';
import {
  useEmployee,
  useDeleteEmployee,
} from '../../../../features/employees/hooks/useEmployees';
import { formatDate, getTenure, getInitials } from '../../../../utils/formatters';
import { showToast } from '../../../../utils/toast';

const TABS = [
  'Personal',
  'Employment',
  'Documents',
  'Attendance',
  'Leaves',
  'Payslips',
  'Assets',
] as const;

type EmployeeStatus = 'Active' | 'On_Probation' | 'Left' | 'Absconding';

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  Active: 'Active',
  On_Probation: 'On Probation',
  Left: 'Left',
  Absconding: 'Absconding',
};

const STATUS_VARIANT: Record<EmployeeStatus, 'green' | 'amber' | 'red' | 'gray'> = {
  Active: 'green',
  On_Probation: 'amber',
  Left: 'red',
  Absconding: 'gray',
};

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const id = Number(params.id);

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Personal');
  const [deleteModal, setDeleteModal] = useState(false);

  const { data: employee, isLoading } = useEmployee(id);
  const deleteMutation = useDeleteEmployee();

  useEffect(() => {
    if (employee) {
      dispatch(
        setPageTitle({
          title: `${employee.first_name} ${employee.last_name}`,
          breadcrumb: 'Employees',
        }),
      );
    }
  }, [employee, dispatch]);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      showToast('Employee removed');
      router.push('/employees');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete');
    }
    setDeleteModal(false);
  };

  if (isLoading) {
    return (
      <AppShell>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)' }}>
          Loading employee…
        </div>
      </AppShell>
    );
  }

  if (!employee) {
    return (
      <AppShell>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--red)' }}>
          Employee not found.
        </div>
      </AppShell>
    );
  }

  const initials = getInitials(`${employee.first_name} ${employee.last_name}`);

  return (
    <AppShell>
      <div className="pg-enter">
        {/* PROFILE HEADER */}
        <div className="profile-hero">
          <div className="ph-av">{initials}</div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>
              {employee.first_name} {employee.last_name}
            </div>

            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
              {employee.employee_code} · {employee.email}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <Chip variant={statusToVariant(employee.status)}>
                {STATUS_LABEL[employee.status as EmployeeStatus] ?? employee.status}
              </Chip>

              {employee.employment_type && (
                <Chip variant="blue">{employee.employment_type}</Chip>
              )}

              {employee.work_location && (
                <Chip variant="teal">{employee.work_location}</Chip>
              )}

              {employee.date_of_joining && (
                <Chip variant="gray">{getTenure(employee.date_of_joining)}</Chip>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="btn btn-sec btn-sm" onClick={() => router.push('/employees')}>
              ← Back
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setDeleteModal(true)}>
              Remove
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs">
          {TABS.map((tab) => (
            <div
              key={tab}
              className={`tab ${activeTab === tab ? 'on' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <div style={{ marginTop: 16 }}>
          {activeTab === 'Personal' && (
            <div className="card cp">
              <div className="ct">Personal Information</div>

              {[
                { label: 'Full Name', value: `${employee.first_name} ${employee.last_name}` },
                { label: 'Work Email', value: employee.email },
                { label: 'Phone', value: employee.phone || '—' },
                { label: 'Date of Birth', value: formatDate(employee.date_of_birth) },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '7px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Employment' && (
            <div className="card cp">
              <div className="ct">Employment Details</div>

              <div>
                {[
                  { label: 'Employee Code', value: employee.employee_code },

                  // ✅ FIXED COMMA HERE WAS MISSING BEFORE
                  {
                    label: 'Status',
                    value: (
                      <Chip variant={STATUS_VARIANT[employee.status as EmployeeStatus] ?? 'gray'}>
                        {STATUS_LABEL[employee.status as EmployeeStatus] ?? employee.status}
                      </Chip>
                    ),
                  },

                  { label: 'Employment Type', value: employee.employment_type },
                  { label: 'Work Location', value: employee.work_location },
                  { label: 'Date of Joining', value: formatDate(employee.date_of_joining) },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Remove Employee"
        subtitle={`Are you sure you want to remove ${employee.first_name} ${employee.last_name}?`}
        footer={
          <>
            <button className="btn btn-sec" onClick={() => setDeleteModal(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              Yes, Remove
            </button>
          </>
        }
      >
        <div style={{ padding: 12, color: 'var(--red)' }}>
          ⚠ This will soft delete the employee.
        </div>
      </Modal>
    </AppShell>
  );
}