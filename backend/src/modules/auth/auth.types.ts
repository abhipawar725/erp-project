// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  company_id?: number;
  role_slug?: string; // default: 'emp'
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ChangePasswordDto {
  current_password: string;
  new_password: string;
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface AuthUserPayload {
  id: number;
  email: string;
  roleId: number;
  roleSlug: string;
  companyId: number;
  employeeId: number | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthLoginResponse extends AuthTokens {
  user: AuthUserPayload;
}

// ─── JWT Payload (stored in token) ───────────────────────────────────────────

export interface JwtAccessPayload {
  userId: number;
  companyId: number;
  roleId: number;
  roleSlug: string;
  email: string;
}

export interface JwtRefreshPayload {
  userId: number;
}
