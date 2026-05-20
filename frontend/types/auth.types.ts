export interface User {
  id: number;
  email: string;
  roleId: number;
  roleSlug: 'hr' | 'admin' | 'mgr' | 'emp';
  companyId: number;
  employeeId?: number | null;
  fullName?: string;
  avatarUrl?: string | null;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface TokenRefreshResponse {
  accessToken: string;
}