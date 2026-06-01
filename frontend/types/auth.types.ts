export interface User {
  id:                  number;
  email:               string;
  roleId:              number;
  roleSlug:            'hr' | 'admin' | 'mgr' | 'emp' | 'super_admin';
  companyId:           number | null;  // null for super admin
  employeeId?:         number | null;
  fullName?:           string | null;
  avatarUrl?:          string | null;
  isSuperAdmin:        boolean;
  // ── Option B: company switch context ────────────────────────────────────
  viewingCompanyId:    number | null;   // non-null when super admin has switched
  viewingCompanyName:  string | null;   // for the banner
}

export interface AuthState {
  user:            User | null;
  accessToken:     string | null;
  isAuthenticated: boolean;
  permissions:     string[];
  // ── Option B: platform token preserved separately ─────────────────────
  platformToken:   string | null;  // original super admin token (no company context)
                                    // restored when exit-company is called
}

export interface LoginCredentials {
  email:    string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user:        User;
}

export interface TokenRefreshResponse {
  accessToken: string;
}

export interface SwitchCompanyResponse {
  scopedToken: string;
  company: { id: number; name: string; slug: string | null };
}

export interface ExitCompanyResponse {
  platformToken: string;
}