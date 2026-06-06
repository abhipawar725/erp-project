import apiClient      from './client';
import { LoginResponse, TokenRefreshResponse, OtpRequestDto, OtpVerifyDto } from '../../types/auth.types';
import { ApiResponse } from '../../types/api.types';

export const authService = {
  // ── OTP flow (replaces password login) ─────────────────────────────────────
  requestOtp: (data: OtpRequestDto) =>
    apiClient.post<unknown, ApiResponse<{ message: string; expires_in: number }>>('/auth/request-otp', data),

  verifyOtp: (data: OtpVerifyDto) =>
    apiClient.post<unknown, ApiResponse<LoginResponse>>('/auth/verify-otp', data),

  // ── Session management ──────────────────────────────────────────────────────
  logout: () =>
    apiClient.post<unknown, ApiResponse<null>>('/auth/logout'),

  refresh: () =>
    apiClient.post<unknown, ApiResponse<TokenRefreshResponse>>('/auth/refresh'),

  getMe: () =>
    apiClient.get<unknown, ApiResponse<LoginResponse['user']>>('/auth/me'),
};
