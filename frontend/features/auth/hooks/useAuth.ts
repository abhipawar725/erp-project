'use client';
// ─── useAuth ──────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter }   from 'next/navigation';
import { authService } from '../../../services/api/auth.service';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  setCredentials, clearCredentials,
  selectUser, selectIsAuthenticated, selectIsSuperAdmin,
  selectHasPermission, selectHasAnyPermission,
  selectPermissions,
} from '../../../store/slices/authSlice';
import type { LoginCredentials } from '../../../types/auth.types';

export function useAuth() {
  const dispatch    = useAppDispatch();
  const router      = useRouter();
  const qc          = useQueryClient();
  const user        = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (response) => {
      const { accessToken, user } = response.data;
      dispatch(setCredentials({ user, accessToken }));
      // Everyone goes to /dashboard — sidebar handles what they see
      router.push('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      dispatch(clearCredentials());
      qc.clear();
      router.push('/login');
    },
  });

  return {
    user,
    isAuthenticated,
    login:       loginMutation.mutate,
    logout:      logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError:  loginMutation.error,
  };
}

// ─── usePermission ────────────────────────────────────────────────────────────
// Primary permission hook. Use this everywhere in components.
//
// Usage:
//   const { hasPermission, isSuperAdmin, canView } = usePermission();
//   if (!canView('employees')) return null;
//   {hasPermission('payroll:approve') && <ApproveButton />}

export function usePermission() {
  const user        = useAppSelector(selectUser);
  const permissions = useAppSelector(selectPermissions);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);

  const hasPermission = (slug: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissions.includes(slug) || permissions.includes('*');
  };

  const hasAnyPermission = (...slugs: string[]): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return slugs.some(s => permissions.includes(s));
  };

  const hasAllPermissions = (...slugs: string[]): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return slugs.every(s => permissions.includes(s));
  };

  // Shorthand helpers
  const canView    = (module: string) => hasPermission(`${module}:view`);
  const canCreate  = (module: string) => hasPermission(`${module}:create`);
  const canEdit    = (module: string) => hasPermission(`${module}:edit`);
  const canDelete  = (module: string) => hasPermission(`${module}:delete`);
  const canApprove = (module: string) => hasPermission(`${module}:approve`);
  const canExport  = (module: string) => hasPermission(`${module}:export`);

  return {
    user,
    isSuperAdmin,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
    canExport,
  };
}
