import apiClient from './client';
import type { ApiResponse } from '../../types/api.types';
import type { RequestOtpDto, VerifyOtpDto, OtpResponse, LoginResponse, AuthUser } from '../../types/auth.types';

export const authService = {
  requestOtp: (data: RequestOtpDto) =>
    apiClient.post<unknown, ApiResponse<OtpResponse>>('/auth/request-otp', data),

  verifyOtp: (data: VerifyOtpDto) =>
    apiClient.post<unknown, ApiResponse<LoginResponse>>('/auth/verify-otp', data),

  refresh: () =>
    apiClient.post<unknown, ApiResponse<{ accessToken: string }>>('/auth/refresh'),

  logout: () =>
    apiClient.post<unknown, ApiResponse<null>>('/auth/logout'),

  getMe: () =>
    apiClient.get<unknown, ApiResponse<AuthUser>>('/auth/me'),
};

