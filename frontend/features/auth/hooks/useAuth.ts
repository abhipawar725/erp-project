'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '../../../store';
import { selectUser, clearCredentials, selectIsAuthenticated, setCredentials } from '@/store/slices/authSlice';
import { authService } from '@/services/api/auth.service';
import { RequestOtpDto, VerifyOtpDto } from '@/types/auth.types';

export function useAuth() {
  const dispatch        = useAppDispatch();
  const router          = useRouter();
  const qc              = useQueryClient();
  const user            = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => { dispatch(clearCredentials()); qc.clear(); router.push('/login'); },
  });

  return { user, isAuthenticated, logout: logoutMutation.mutate, isLoggingOut: logoutMutation.isPending };
}

export function useOtpLogin() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const [step, setStep]           = useState<'request' | 'verify'>('request');
  const [contact, setContact]     = useState('');
  const [error, setError]         = useState('');
  const [expiresIn, setExpiresIn] = useState(0);

  const requestMutation = useMutation({
    mutationFn: (d: RequestOtpDto) => authService.requestOtp(d),
    onSuccess:  (res, vars) => { setContact(vars.email_or_phone); setExpiresIn(res.data.expires_in); setError(''); setStep('verify'); },
    onError:    (e: any)   => setError(e?.message || 'Failed to send OTP.'),
  });

  const verifyMutation = useMutation({
    mutationFn: (d: VerifyOtpDto) => authService.verifyOtp(d),
    onSuccess:  (res) => {
      const { accessToken, user } = res.data;
      dispatch(setCredentials({ user, accessToken }));
      router.push('/dashboard');
    },
    onError: (e: any) => setError(e?.message || 'Invalid OTP.'),
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