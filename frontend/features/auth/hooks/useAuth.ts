'use client';
import { useState }                  from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter }                 from 'next/navigation';
import { authService }               from '../../../services/api/auth.service';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  setCredentials, clearCredentials,
  selectUser, selectIsAuthenticated,
  selectIsSuperAdmin, selectPermissions,
} from '../../../store/slices/authSlice';

// ─── useAuth — core session ───────────────────────────────────────────────────

export function useAuth() {
  const dispatch   = useAppDispatch();
  const router     = useRouter();
  const qc         = useQueryClient();
  const user       = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

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
    logout:       logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}

// ─── useOtpLogin — 2-step OTP login flow ─────────────────────────────────────

export function useOtpLogin() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const [step, setStep]           = useState<'request' | 'verify'>('request');
  const [contact, setContact]     = useState('');
  const [error, setError]         = useState('');
  const [expiresIn, setExpiresIn] = useState(0);

  const requestMutation = useMutation({
    mutationFn: (emailOrPhone: string) =>
      authService.requestOtp({ email_or_phone: emailOrPhone }),
    onSuccess: (_, emailOrPhone) => {
      setContact(emailOrPhone);
      setExpiresIn(600);
      setError('');
      setStep('verify');
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || e?.message || 'Failed to send OTP'),
  });

  const verifyMutation = useMutation({
    mutationFn: (otp: string) =>
      authService.verifyOtp({ email_or_phone: contact, otp }),
    onSuccess: (response) => {
      const { accessToken, user } = response.data;
      // setCredentials now correctly stores isSuperAdmin + permissions
      dispatch(setCredentials({ user, accessToken }));
      router.push('/dashboard');
    },
    onError: (e: any) =>
      setError(e?.response?.data?.message || e?.message || 'Invalid OTP'),
  });

  return {
    step,
    contact,
    error,
    expiresIn,
    requestOtp:     (emailOrPhone: string) => requestMutation.mutate(emailOrPhone),
    verifyOtp:      (otp: string) => verifyMutation.mutate(otp),
    isRequesting:   requestMutation.isPending,
    isVerifying:    verifyMutation.isPending,
    resetToRequest: () => { setStep('request'); setError(''); },
  };
}

// ─── usePermission — permission checks everywhere ────────────────────────────

export function usePermission() {
  const user         = useAppSelector(selectUser);
  const permissions  = useAppSelector(selectPermissions);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);

  const hasPermission = (slug: string): boolean => {
    if (!user) return false;
    // Super admin bypasses ALL permission checks
    if (isSuperAdmin) return true;
    // Wildcard
    if (permissions.includes('*')) return true;
    return permissions.includes(slug);
  };

  return {
    user,
    isSuperAdmin,
    permissions,
    hasPermission,
    canView:    (module: string) => hasPermission(`${module}:view`),
    canCreate:  (module: string) => hasPermission(`${module}:create`),
    canEdit:    (module: string) => hasPermission(`${module}:edit`),
    canDelete:  (module: string) => hasPermission(`${module}:delete`),
    canDownload:  (module: string) => hasPermission(`${module}:download`),
  };
}


