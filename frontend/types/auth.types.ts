// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id:           number;
  email:        string;
  roleId:       number;
  roleSlug:     string;
  companyId:    number;       // always set — super admin uses company 1
  employeeId?:  number | null;
  fullName?:    string | null;
  avatarUrl?:   string | null;
  isSuperAdmin: boolean;
  permissions:  string[];     // module slugs, e.g. ['employees:view','payroll:approve']
                              // super admin gets ['*'] — frontend checks isSuperAdmin
}

// ─── Auth state ───────────────────────────────────────────────────────────────

export interface AuthState {
  user:            User | null;
  accessToken:     string | null;
  isAuthenticated: boolean;
  permissions:     string[];
}

// ─── Request/Response DTOs ────────────────────────────────────────────────────

export interface LoginCredentials {
  email:    string;
  password: string;
}

export interface LoginResponse {
  accessToken:  string;
  refreshToken?: string;
  user:         User;
}

export interface TokenRefreshResponse {
  accessToken:  string;
  refreshToken?: string;
}
