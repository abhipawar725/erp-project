'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter }    from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../store';
import { setCredentials, clearCredentials, selectUser, selectIsAuthenticated, selectIsSuperAdmin } from '../../../store/slices/authSlice';

export function useAuth() {
  const dispatch        = useAppDispatch();
  const router          = useRouter();
  const qc              = useQueryClient();
  const user            = useAppSelector(selectUser);            // ← 'user' unchanged
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // user.userId still accessible — nothing breaks
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      dispatch(clearCredentials());
      qc.clear();
      router.push('/login');
    },
  });

  return {
    user,                // ← same shape, same name
    isAuthenticated,
    logout:       logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}

// OTP login hook — 2-step flow
export function useOtpLogin() {
  const dispatch   = useAppDispatch();
  const router     = useRouter();
  const [step, setStep]       = useState<'request' | 'verify'>('request');
  const [contact, setContact] = useState('');
  const [error, setError]     = useState('');
  const [expiresIn, setExpiresIn] = useState(0);

  const requestMutation = useMutation({
    mutationFn: (data: RequestOtpDto) => authService.requestOtp(data),
    onSuccess: (res, vars) => {
      setContact(vars.email_or_phone);
      setExpiresIn(res.data.expires_in);
      setError('');
      setStep('verify');
    },
    onError: (e: any) => setError(e?.message || 'Failed to send OTP. Please try again.'),
  });

  const verifyMutation = useMutation({
    mutationFn: (data: VerifyOtpDto) => authService.verifyOtp(data),
    onSuccess: (res) => {
      const { accessToken, user } = res.data;  // ← 'user' key from backend, preserved
      dispatch(setCredentials({ user, accessToken }));
      router.push('/dashboard');
    },
    onError: (e: any) => setError(e?.message || 'Invalid OTP. Please try again.'),
  });

  return {
    step, contact, error, expiresIn,
    requestOtp:     (emailOrPhone: string, channel?: 'email' | 'sms') =>
                      requestMutation.mutate({ email_or_phone: emailOrPhone, channel }),
    verifyOtp:      (otp: string) =>
                      verifyMutation.mutate({ email_or_phone: contact, otp }),
    isRequesting:   requestMutation.isPending,
    isVerifying:    verifyMutation.isPending,
    resetToRequest: () => { setStep('request'); setError(''); },
  };
}
