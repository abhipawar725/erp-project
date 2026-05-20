'use client';

import { useEffect } from 'react';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { useAppDispatch } from '../../../../../store';

import { setPageTitle } from '../../../../../store/slices/uiSlice';

import { AppShell } from '../../../../../layouts/AppLayout';

import { EmployeeWizard } from '../../../../../features/employees/components/EmployeeWizard';

import { useEmployee } from '../../../../../features/employees/hooks/useEmployees';

import type { Employee } from '../../../../../features/employees/types/employee.types';

import { departmentService } from '../../../../../services/api/department.service';

import { designationService } from '../../../../../services/api/designation.service';

import { employeeService } from '../../../../../services/api/employee.service';

interface SelectOption {
  value: number;
  label: string;
}

export default function EditEmployeePage() {
  const params = useParams();

  const router = useRouter();

  const dispatch = useAppDispatch();

  /* ------------------------------------------------ */
  /* SAFE PARAM ID */
  /* ------------------------------------------------ */

  const rawId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const id = Number(rawId);

  /* ------------------------------------------------ */
  /* EMPLOYEE */
  /* ------------------------------------------------ */

  const {
    data: employee,
    isLoading,
    isError,
  } = useEmployee(id);

  /* ------------------------------------------------ */
  /* DEPARTMENTS */
  /* ------------------------------------------------ */

  const {
    data: deptsRes,
  } = useQuery({
    queryKey: ['departments'],

    queryFn: () =>
      departmentService.getAll(),

    staleTime: 5 * 60_000,
  });

  /* ------------------------------------------------ */
  /* DESIGNATIONS */
  /* ------------------------------------------------ */

  const {
    data: designationsRes,
  } = useQuery({
    queryKey: ['designations'],

    queryFn: () =>
      designationService.getAll(),

    staleTime: 5 * 60_000,
  });

  /* ------------------------------------------------ */
  /* MANAGERS */
  /* ------------------------------------------------ */

  const {
    data: managersRes,
  } = useQuery({
    queryKey: ['employee-managers'],

    queryFn: () =>
      employeeService.getManagers(),

    staleTime: 5 * 60_000,
  });

  /* ------------------------------------------------ */
  /* PAGE TITLE */
  /* ------------------------------------------------ */

  useEffect(() => {
    if (!employee) return;

    dispatch(
      setPageTitle({
        title: `Edit — ${employee.first_name} ${employee.last_name}`,

        breadcrumb: 'Employees',
      }),
    );
  }, [employee, dispatch]);

  /* ------------------------------------------------ */
  /* LOADING */
  /* ------------------------------------------------ */

  if (isLoading) {
    return (
      <AppShell
        allowedRoles={[
          'hr',
          'admin',
        ]}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--ink4)',
            fontSize: 13,
          }}
        >
          Loading employee data…
        </div>
      </AppShell>
    );
  }

  /* ------------------------------------------------ */
  /* ERROR */
  /* ------------------------------------------------ */

  if (isError || !employee) {
    return (
      <AppShell
        allowedRoles={[
          'hr',
          'admin',
        ]}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--red)',
            fontSize: 13,
          }}
        >
          Employee not found.

          <span
            style={{
              cursor: 'pointer',
              color: 'var(--blue)',
              marginLeft: 6,
            }}
            onClick={() =>
              router.back()
            }
          >
            Go back
          </span>
        </div>
      </AppShell>
    );
  }

  /* ------------------------------------------------ */
  /* OPTIONS */
  /* ------------------------------------------------ */

  const departments: SelectOption[] =
    (
      deptsRes?.data || []
    ).map(
      (d: {
        id: number;
        name: string;
      }) => ({
        value: d.id,
        label: d.name,
      }),
    );

  const designations: SelectOption[] =
    (
      designationsRes?.data || []
    ).map(
      (d: {
        id: number;
        name: string;
      }) => ({
        value: d.id,
        label: d.name,
      }),
    );

  const managers: SelectOption[] =
    (
      managersRes?.data || []
    ).map(
      (m: Employee) => ({
        value: m.id,
        label: `${m.first_name} ${m.last_name}`,
      }),
    );

  /* ------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------ */

  return (
    <AppShell
      allowedRoles={[
        'hr',
        'admin',
      ]}
    >
      <div className="pg-enter">
        {/* HEADER */}

        <div className="ph">
          <div>
            <h1>
              Edit Employee Profile
            </h1>

            <p>
              {
                employee.employee_code
              }{' '}
              ·{' '}
              {
                employee.first_name
              }{' '}
              {
                employee.last_name
              }
            </p>
          </div>

          <div className="ph-r">
            <button
              className="btn btn-sec btn-sm"
              onClick={() =>
                router.push(
                  `/employees/${id}`,
                )
              }
            >
              ← View Profile
            </button>
          </div>
        </div>

        {/* WIZARD */}

        <EmployeeWizard
          mode="edit"
          employee={employee}
          departments={departments}
          designations={
            designations
          }
          managers={managers}
          onSuccess={(emp) =>
            router.push(
              `/employees/${emp.id}`,
            )
          }
        />
      </div>
    </AppShell>
  );
}