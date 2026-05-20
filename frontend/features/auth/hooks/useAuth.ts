'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api/auth.service';
import { useAppDispatch, useAppSelector } from '@/store';
import { setCredentials, clearCredentials, selectUser, selectIsAuthenticated } from '@/store/slices/authSlice';
import { LoginCredentials } from '@/types/auth.types';
// import { setAccessToken } from '@/services/api/client';

export function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (response) => {
      const { accessToken, user } = response.data;
      // setAccessToken(accessToken)
      dispatch(setCredentials({ user, accessToken }));
      router.push('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      dispatch(clearCredentials());
      queryClient.clear();
      router.push('/login');
    },
  });

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
  };
}