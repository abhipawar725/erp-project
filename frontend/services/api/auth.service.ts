import apiClient from './client';
import { LoginCredentials, LoginResponse, TokenRefreshResponse } from '../../types/auth.types';
import { ApiResponse } from '../../types/api.types';

export const authService = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<unknown, ApiResponse<LoginResponse>>('/auth/login', credentials),

  logout: () =>
    apiClient.post<unknown, ApiResponse<null>>('/auth/logout'),

  refresh: () =>
    apiClient.post<unknown, ApiResponse<TokenRefreshResponse>>('/auth/refresh'),

  forgotPassword: (email: string) =>
    apiClient.post<unknown, ApiResponse<null>>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post<unknown, ApiResponse<null>>('/auth/reset-password', { token, password }),

  getMe: () =>
    apiClient.get<unknown, ApiResponse<LoginResponse['user']>>('/auth/me'),
};