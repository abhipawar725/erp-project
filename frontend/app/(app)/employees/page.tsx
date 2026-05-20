'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAppDispatch } from '../../../store';

import { setPageTitle } from '../../../store/slices/uiSlice';

import { AppShell } from '../../../layouts/AppLayout';

import {
  DataTable,
  type Column,
} from '../../../components/ui/DataTable';

import {
  Chip,
  statusToVariant,
} from '../../../components/ui/Chip';

import { StatCard } from '../../../components/ui/StatCard';

import {
  useEmployees,
  useEmployeeSummary,
  useDeleteEmployee,
} from '../../../features/employees/hooks/useEmployees';

import { useDebounce } from '../../../hooks/useDebounce';

import { usePermission } from '../../../features/auth/hooks/usePermission';

import type {
  Employee,
  EmployeeStatus,
} from '../../../features/employees/types/employee.types';

import {
  formatDate,
  getTenure,
  getInitials,
} from '../../../utils/formatters';

import { Modal } from '../../../components/ui/Modal';

import { showToast } from '../../../utils/toast';

export default function EmployeesPage() {
  const router = useRouter();

  const dispatch = useAppDispatch();

  const { isHR, isAdmin } =
    usePermission();

  /* ------------------------------------------------ */
  /* STATE */
  /* ------------------------------------------------ */

  const [page, setPage] =
    useState(1);

  const [search, setSearch] =
    useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    EmployeeStatus | ''
  >('');

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<Employee | null>(
    null,
  );

  /* ------------------------------------------------ */
  /* SEARCH */
  /* ------------------------------------------------ */

  const debouncedSearch =
    useDebounce(search, 400);

  /* ------------------------------------------------ */
  /* QUERIES */
  /* ------------------------------------------------ */

  const {
    data,
    isLoading,
    isError,
  } = useEmployees({
    page,
    limit: 20,

    search:
      debouncedSearch || undefined,

    status:
      statusFilter || undefined,
  });

  const { data: summary } =
    useEmployeeSummary();

  const deleteMutation =
    useDeleteEmployee();

  /* ------------------------------------------------ */
  /* PAGE TITLE */
  /* ------------------------------------------------ */

  useEffect(() => {
    dispatch(
      setPageTitle({
        title:
          'Employee Directory',

        breadcrumb:
          'People & Performance',
      }),
    );
  }, [dispatch]);

  /* ------------------------------------------------ */
  /* PERMISSIONS */
  /* ------------------------------------------------ */

  const canManage =
    isHR || isAdmin;

  /* ------------------------------------------------ */
  /* DELETE */
  /* ------------------------------------------------ */

const handleDelete = async () => {
  if (!deleteTarget) return;

  try {
    await deleteMutation.mutateAsync(
      Number(deleteTarget.id),
    );

    showToast(
      'Employee removed successfully',
    );

    setDeleteTarget(null);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to remove employee';

    showToast(message);
  }
};

  /* ------------------------------------------------ */
  /* COLUMNS */
  /* ------------------------------------------------ */

  const columns: Column<Employee>[] =
    [
      {
        key: 'name',

        header: 'Employee',

        render: (row) => (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {row.avatar_url ? (
              <Image
                src={row.avatar_url}
                alt={`${row.first_name} ${row.last_name}`}
                width={32}
                height={32}
                style={{
                  borderRadius: 8,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,

                  borderRadius: 8,

                  background:
                    'linear-gradient(135deg, var(--blue), var(--purple))',

                  color: '#fff',

                  display: 'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  fontSize: 10,

                  fontWeight: 700,

                  flexShrink: 0,
                }}
              >
                {getInitials(
                  `${row.first_name} ${row.last_name}`,
                )}
              </div>
            )}

            <div>
              <strong
                style={{
                  cursor: 'pointer',
                  color:
                    'var(--blue)',
                }}
                onClick={(e) => {
                  e.stopPropagation();

                  router.push(
                    `/employees/${row.id}`,
                  );
                }}
              >
                {row.first_name}{' '}
                {row.last_name}
              </strong>

              <div
                style={{
                  fontSize: 10,
                  color:
                    'var(--ink4)',
                }}
              >
                {
                  row.employee_code
                }
              </div>
            </div>
          </div>
        ),
      },

      {
        key: 'email',

        header: 'Email',

        render: (row) => (
          <span
            style={{
              fontSize: 11,
            }}
          >
            {row.email}
          </span>
        ),
      },

      {
        key: 'department',

        header: 'Department',

        render: (row) => (
          <span
            style={{
              fontSize: 11,
            }}
          >
            {(row as any)
              ?.department
              ?.name || '—'}
          </span>
        ),
      },

      {
        key: 'employment_type',

        header: 'Type',

        render: (row) => (
          <Chip variant="blue">
            {
              row.employment_type
            }
          </Chip>
        ),
      },

      {
        key: 'work_location',

        header: 'Location',

        render: (row) => (
          <Chip variant="teal">
            {row.work_location}
          </Chip>
        ),
      },

      {
        key: 'status',

        header: 'Status',

        render: (row) => (
          <Chip
            variant={statusToVariant(
              row.status,
            )}
          >
            {row.status}
          </Chip>
        ),
      },

      {
        key: 'date_of_joining',

        header: 'Joined',

        render: (row) => (
          <div>
            <div
              style={{
                fontSize: 11,
                color:
                  'var(--ink4)',
              }}
            >
              {formatDate(
                row.date_of_joining,
              )}
            </div>

            {row.date_of_joining && (
              <div
                style={{
                  fontSize: 10,
                  color:
                    'var(--ink4)',
                }}
              >
                {getTenure(
                  row.date_of_joining,
                )}
              </div>
            )}
          </div>
        ),
      },

      {
        key: 'actions',

        header: 'Actions',

        render: (row) => (
          <div
            style={{
              display: 'flex',
              gap: 4,
            }}
          >
            <Chip
              variant="blue"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();

                router.push(
                  `/employees/${row.id}`,
                );
              }}
            >
              View
            </Chip>

            {canManage && (
              <Chip
                variant="gray"
                onClick={(e: any) => {
                  e.stopPropagation();

                  router.push(
                    `/employees/${row.id}/edit`,
                  );
                }}
              >
                Edit
              </Chip>
            )}

            {canManage && (
              <Chip
                variant="red"
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.stopPropagation();

                  setDeleteTarget(
                    row,
                  );
                }}
              >
                Remove
              </Chip>
            )}
          </div>
        ),
      },
    ];

  /* ------------------------------------------------ */
  /* TOOLBAR */
  /* ------------------------------------------------ */

  const toolbar = (
    <>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        All Employees

        <span
          style={{
            fontSize: 11,

            color:
              'var(--ink4)',

            fontWeight: 400,

            marginLeft: 6,
          }}
        >
          {data?.meta?.total ??
            '…'}{' '}
          total
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {/* STATUS */}

        <select
          style={{
            background:
              'var(--surface2)',

            border:
              '1px solid var(--border)',

            borderRadius:
              'var(--r)',

            padding:
              '6px 10px',

            fontSize: 12,

            fontFamily:
              'var(--font)',

            outline: 'none',
          }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(
              e.target
                .value as any,
            );

            setPage(1);
          }}
        >
          <option value="">
            All Status
          </option>

          <option value="Active">
            Active
          </option>

          <option value="On_Probation">
            On Probation
          </option>

          <option value="Left">
            Left
          </option>

          <option value="Absconding">
            Absconding
          </option>
        </select>

        {/* SEARCH */}

        <div className="search-bar">
          <span
            style={{
              color:
                'var(--ink4)',
            }}
          >
            ⌕
          </span>

          <input
            type="text"
            placeholder="Search name, email, code…"
            value={search}
            onChange={(e) => {
              setSearch(
                e.target.value,
              );

              setPage(1);
            }}
          />
        </div>
      </div>
    </>
  );

  /* ------------------------------------------------ */
  /* ERROR */
  /* ------------------------------------------------ */

  if (isError) {
    return (
      <AppShell>
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--red)',
          }}
        >
          Failed to load
          employees.
        </div>
      </AppShell>
    );
  }

  /* ------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------ */

  return (
    <AppShell
      onAddNew={
        canManage
          ? () =>
            router.push(
              '/employees/new',
            )
          : undefined
      }
    >
      <div className="pg-enter">
        {/* PAGE HEADER */}

        <div className="ph">
          <div>
            <h1>
              Employee Directory
            </h1>

            <p>
              All employees ·
              Multi-location ·
              Role-based access
              control
            </p>
          </div>

          <div className="ph-r">
            <button
              className="btn btn-sec btn-sm"
              disabled
            >
              ↓ Export
            </button>

            {canManage && (
              <button
                className="btn btn-pri btn-sm"
                onClick={() =>
                  router.push(
                    '/employees/new',
                  )
                }
              >
                + Add Employee
              </button>
            )}
          </div>
        </div>

        {/* STATS */}

        <div className="g4 mb14">
          <StatCard
            label="Total Employees"
            value={
              summary?.total ??
              '…'
            }
            color="var(--blue)"
          />

          <StatCard
            label="Active"
            value={
              summary?.active ??
              '…'
            }
            color="var(--green)"
          />

          <StatCard
            label="On Probation"
            value={
              summary?.onProbation ??
              '…'
            }
            color="var(--amber)"
          />

          <StatCard
            label="Left / Alumni"
            value={
              summary?.left ??
              '…'
            }
            color="var(--red)"
          />
        </div>

        {/* TABLE */}

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          toolbar={toolbar}
          page={page}
          totalPages={
            data?.meta?.totalPages
          }
          total={data?.meta?.total}
          limit={20}
          onPageChange={setPage}
          onRowClick={(row) =>
            router.push(
              `/employees/${row.id}`,
            )
          }
        />
      </div>

      {/* DELETE MODAL */}

      <Modal
        open={!!deleteTarget}
        onClose={() =>
          setDeleteTarget(null)
        }
        title="Remove Employee"
        subtitle={`Remove ${deleteTarget?.first_name} ${deleteTarget?.last_name} from the system?`}
        footer={
          <>
            <button
              className="btn btn-sec"
              onClick={() =>
                setDeleteTarget(
                  null,
                )
              }
            >
              Cancel
            </button>

            <button
              className="btn btn-danger"
              onClick={
                handleDelete
              }
              disabled={
                deleteMutation.isPending
              }
            >
              {deleteMutation.isPending
                ? 'Removing…'
                : 'Yes, Remove'}
            </button>
          </>
        }
      >
        <div
          style={{
            background:
              'var(--red-lt)',

            border:
              '1px solid var(--red-bd)',

            borderRadius:
              'var(--r)',

            padding:
              '10px 14px',

            fontSize: 12,

            color: 'var(--red)',
          }}
        >
          ⚠ This performs a
          soft delete. The
          record is preserved
          in audit logs and
          can be restored by
          an Admin.
        </div>
      </Modal>
    </AppShell>
  );
}