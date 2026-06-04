export interface AuthUser {
  id:           number;
  employeeId:   number;   // same as id — the employee IS the identity
  email:        string;
  fullName:     string;
  firstName:    string;
  lastName:     string;
  avatarUrl?:   string | null;
  companyId:    number;
  roleId:       number;
  roleSlug:     string;
  isSuperAdmin: boolean;
  permissions:  string[];
}

export interface AuthState {
  user:            AuthUser | null;
  accessToken:     string | null;
  isAuthenticated: boolean;
  permissions:     string[];
}

export interface RequestOtpDto  { email_or_phone: string; channel?: 'email' | 'sms'; }
export interface VerifyOtpDto   { email_or_phone: string; otp: string; }
export interface OtpResponse    { message: string; expires_in: number; }
export interface LoginResponse  { accessToken: string; user: AuthUser; }