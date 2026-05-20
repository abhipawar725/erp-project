'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppDispatch } from '../../../../store';
import { setPageTitle } from '../../../../store/slices/uiSlice';
import { AppShell } from '../../../../layouts/AppLayout';
import { EmployeeWizard } from '../../../../features/employees/components/EmployeeWizard';
import { departmentService } from '../../../../services/api/department.service';

export default function NewEmployeePage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Add New Employee', breadcrumb: 'Employees' }));
  }, [dispatch]);

  // Load departments for the employment step dropdown
  const { data: deptsRes } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAll(),
    staleTime: 5 * 60_000,
  });

  const departments = (deptsRes?.data || []).map((d: any) => ({ value: d.id, label: d.name }));

  return (
    <AppShell allowedRoles={['hr', 'admin']}>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Add New Employee</h1>
            <p>Complete the 5-step onboarding profile. Steps 1 &amp; 2 are required.</p>
          </div>
        </div>
        <EmployeeWizard mode="create" departments={departments} />
      </div>
    </AppShell>
  );
}
