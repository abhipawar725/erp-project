'use client';
import { useAppSelector } from '../../../store';
import {
  selectPermissions,
  selectCurrentRole,
  selectUser,
} from '../../../store/slices/authSlice';

/**
 * usePermission — fine-grained permission and role checking hook.
 *
 * HR and Admin roles bypass all permission slug checks.
 * Other roles are checked against the permissions[] array in Redux
 * (populated from the server on login).
 *
 * Usage:
 *   const { hasPermission, isHR, isAdmin } = usePermission();
 *
 *   // Guard a button
 *   {hasPermission('employees:delete') && <DeleteButton />}
 *
 *   // Guard a route
 *   if (!hasPermission('payroll:read')) return <Forbidden />;
 */
export function usePermission() {
  const permissions = useAppSelector(selectPermissions);
  const role        = useAppSelector(selectCurrentRole);
  const user        = useAppSelector(selectUser);

  /**
   * Returns true if the current user has the given permission slug.
   * HR and Admin always return true regardless of slugs.
   */
  const hasPermission = (slug: string): boolean => {
    if (role === 'hr' || role === 'admin') return true;
    return permissions.includes(slug);
  };

  /**
   * Returns true if the user has ANY of the given slugs.
   */
  const hasAnyPermission = (...slugs: string[]): boolean =>
    slugs.some((s) => hasPermission(s));

  /**
   * Returns true if the user has ALL of the given slugs.
   */
  const hasAllPermissions = (...slugs: string[]): boolean =>
    slugs.every((s) => hasPermission(s));

  /**
   * Returns true if the user can only access their own resources
   * (i.e. is an Employee role without elevated permissions).
   */
  const isSelfOnly = role === 'emp';

  return {
    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Role flags
    role,
    isHR:       role === 'hr',
    isAdmin:    role === 'admin',
    isManager:  role === 'mgr',
    isEmployee: role === 'emp',
    isSelfOnly,

    // Convenience
    canManageEmployees: role === 'hr' || role === 'admin',
    canApproveLeaves:   role === 'hr' || role === 'admin' || role === 'mgr',
    canViewPayroll:     role === 'hr' || role === 'admin',
    canViewSensitive:   role === 'hr' || role === 'admin',

    // Current user
    userId:    user?.id,
    companyId: user?.companyId,
  };
}