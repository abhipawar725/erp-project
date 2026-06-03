import apiClient from './client';
import { ApiResponse } from '../../types/api.types';

export const authService = {
  // NEW: OTP flow replaces login
  requestOtp: (data: RequestOtpDto) =>
    apiClient.post<unknown, ApiResponse<OtpRequestResponse>>('/auth/request-otp', data),

  verifyOtp: (data: VerifyOtpDto) =>
    apiClient.post<unknown, ApiResponse<LoginResponse>>('/auth/verify-otp', data),

  // These stay identical — same paths, same signatures
  refresh: () =>
    apiClient.post<unknown, ApiResponse<{ accessToken: string }>>('/auth/refresh'),

  logout: () =>
    apiClient.post<unknown, ApiResponse<null>>('/auth/logout'),

  getMe: () =>
    apiClient.get<unknown, ApiResponse<AuthUser>>('/auth/me'),
};
