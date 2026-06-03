export interface AuthUser {
  // userId = employee.id — name preserved for full backward compat
  // All existing references to user.userId / state.auth.user.userId unchanged
  id:           number;
  userId:       number;        // ← kept — same value as id / employeeId
  employeeId:   number;        // explicit alias
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
  user:            AuthUser | null;   // ← field name 'user' kept (not 'employee')
  accessToken:     string | null;
  isAuthenticated: boolean;
  permissions:     string[];
}

export interface RequestOtpDto {
  email_or_phone: string;
  channel?:       'email' | 'sms';
}

export interface VerifyOtpDto {
  email_or_phone: string;
  otp:            string;
}

export interface OtpRequestResponse {
  message:    string;
  expires_in: number;
}

export interface LoginResponse {
  accessToken: string;
  user:        AuthUser;   // ← 'user' key kept in response
}
