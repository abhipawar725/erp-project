import { EmployeeQueryParams } from '../features/employees/types/employee.types';

/**
 * Centralized query key factory.
 * Ensures cache invalidation is consistent across the app.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },

  employees: {
    all: ['employees'] as const,
    list: (params?: EmployeeQueryParams) => ['employees', 'list', params] as const,
    detail: (id: number) => ['employees', 'detail', id] as const,
    documents: (id: number) => ['employees', id, 'documents'] as const,
  },

  departments: {
    all: ['departments'] as const,
    list: () => ['departments', 'list'] as const,
  },

  designations: {
    all: ['designations'] as const,
    list: (departmentId?: number) => ['designations', 'list', departmentId] as const,
  },

  attendance: {
    all: ['attendance'] as const,
    summary: (date: string) => ['attendance', 'summary', date] as const,
    byEmployee: (employeeId: number, month: number, year: number) =>
      ['attendance', employeeId, month, year] as const,
  },

  leaves: {
    all: ['leaves'] as const,
    list: (params?: Record<string, unknown>) => ['leaves', 'list', params] as const,
    balance: (employeeId: number) => ['leaves', 'balance', employeeId] as const,
    types: ['leaves', 'types'] as const,
  },

  payroll: {
    runs: ['payroll', 'runs'] as const,
    run: (id: number) => ['payroll', 'run', id] as const,
    payslips: (employeeId: number) => ['payroll', 'payslips', employeeId] as const,
  },

  candidates: {
    all: ['candidates'] as const,
    list: (params?: Record<string, unknown>) => ['candidates', 'list', params] as const,
    detail: (id: number) => ['candidates', 'detail', id] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: () => ['notifications', 'list'] as const,
  },

  roles: {
    all: ['roles'] as const,
    list: () => ['roles', 'list'] as const,
    permissions: (roleId: number) => ['roles', roleId, 'permissions'] as const,
  },

  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    activity: ['dashboard', 'activity'] as const,
  },
};