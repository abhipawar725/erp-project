'use client';
// ─── useAuth ─────────────────────────────────────────────────────────────────
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter }   from 'next/navigation';
import { authService } from '../../../services/api/auth.service';
import { useAppDispatch, useAppSelector } from '../../../store/index';
import {
  setCredentials, clearCredentials,
  switchToCompany, exitCompany,
  selectUser, selectIsAuthenticated,
  selectIsViewingCompany, selectViewingCompany,
} from '../../../store/slices/authSlice';
import { LoginCredentials } from '../../../types/auth.types';
import apiClient from '../../../services/api/client';
import { showToast } from '../../../utils/toast';

export function useAuth() {
  const dispatch    = useAppDispatch();
  const router      = useRouter();
  const qc          = useQueryClient();
  const user        = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // ── Login ──────────────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (response) => {
      const { accessToken, user } = response.data;
      dispatch(setCredentials({ user, accessToken }));
      // Redirect based on user type
      if (user.isSuperAdmin) {
        router.push('/super-admin');
      } else {
        router.push('/dashboard');
      }
    },
  });

  // ── Logout ─────────────────────────────────────────────────────────────────
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

// ─── useSuperAdminSwitch ──────────────────────────────────────────────────────
// Hook used inside the super admin dashboard to switch into / exit a company.

export function useSuperAdminSwitch() {
  const dispatch          = useAppDispatch();
  const router            = useRouter();
  const qc                = useQueryClient();
  const isViewingCompany  = useAppSelector(selectIsViewingCompany);
  const viewingCompany    = useAppSelector(selectViewingCompany);

  // ── Switch into company ────────────────────────────────────────────────────
  const switchMutation = useMutation({
    mutationFn: (companyId: number) =>
      apiClient.post<any, any>(`/super/switch-company/${companyId}`),

    onSuccess: (res, companyId) => {
      const { scopedToken, company } = res.data;

      // Store scoped token + update user context
      dispatch(switchToCompany({
        scopedToken,
        companyId:   company.id,
        companyName: company.name,
      }));

      // Clear all cached company-scoped queries so fresh data loads
      qc.clear();

      showToast(`👁 Viewing ${company.name}`);

      // Redirect to company dashboard
      router.push('/dashboard');
    },

    onError: (e: any) => showToast(e?.message || 'Failed to switch company'),
  });

  // ── Exit company view ──────────────────────────────────────────────────────
  const exitMutation = useMutation({
    mutationFn: () =>
      apiClient.post<any, any>('/super/exit-company'),

    onSuccess: (res) => {
      const { platformToken } = res.data;

      dispatch(exitCompany({ platformToken }));

      // Clear all company-scoped cache
      qc.clear();

      showToast('Exited company view');

      // Return to super admin dashboard
      router.push('/super-admin');
    },

    onError: (e: any) => showToast(e?.message || 'Failed to exit company view'),
  });

  return {
    isViewingCompany,
    viewingCompany,
    switchToCompany: switchMutation.mutate,
    exitCompany:     exitMutation.mutate,
    isSwitching:     switchMutation.isPending,
    isExiting:       exitMutation.isPending,
  };
}
