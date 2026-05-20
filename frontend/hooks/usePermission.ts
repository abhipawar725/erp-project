'use client';
import { useAppSelector } from '../store';
import { selectPermissions, selectCurrentRole } from '../store/slices/authSlice';

export function usePermission() {
  const permissions = useAppSelector(selectPermissions);
  const role = useAppSelector(selectCurrentRole);

  const hasPermission = (slug: string): boolean => {
    if (role === 'hr' || role === 'admin') return true;
    return permissions.includes(slug);
  };

  const hasAnyPermission = (...slugs: string[]): boolean =>
    slugs.some(hasPermission);

  const hasAllPermissions = (...slugs: string[]): boolean =>
    slugs.every(hasPermission);

  const isHR = role === 'hr';
  const isAdmin = role === 'admin';
  const isManager = role === 'mgr';
  const isEmployee = role === 'emp';

  return { hasPermission, hasAnyPermission, hasAllPermissions, role, isHR, isAdmin, isManager, isEmployee };
}