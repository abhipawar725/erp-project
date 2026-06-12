import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, ManagedCompany } from '../../types/auth.types';

const initialState: AuthState = {
  user:            null,
  accessToken:     null,
  isAuthenticated: false,
  permissions:     [],
  activeCompanyId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User; accessToken: string }>) {
      const { user, accessToken } = action.payload;
      state.user            = user;
      state.accessToken     = accessToken;
      state.isAuthenticated = true;
      state.permissions     = user.permissions ?? [];
      // Default active company = home company
      state.activeCompanyId = user.companyId;
    },

    // Switch active company — used by CompanySwitcher in sidebar
    // When an employee manages multiple companies, switching here
    // scopes all data fetches (roles, permissions, employees) to that company
    switchCompany(state, action: PayloadAction<number>) {
      state.activeCompanyId = action.payload;
    },

    updateToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },

    clearCredentials(state) {
      state.user            = null;
      state.accessToken     = null;
      state.isAuthenticated = false;
      state.permissions     = [];
      state.activeCompanyId = null;
    },

    setPermissions(state, action: PayloadAction<string[]>) {
      state.permissions = action.payload;
      if (state.user) state.user.permissions = action.payload;
    },

    // Refresh managed companies list after assigning/removing
    setManagedCompanies(state, action: PayloadAction<ManagedCompany[]>) {
      if (state.user) state.user.managedCompanies = action.payload;
    },
  },
});

export const {
  setCredentials,
  switchCompany,
  updateToken,
  clearCredentials,
  setPermissions,
  setManagedCompanies,
} = authSlice.actions;

export default authSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectUser             = (s: { auth: AuthState }) => s.auth.user;
export const selectIsAuthenticated  = (s: { auth: AuthState }) => s.auth.isAuthenticated;
export const selectPermissions      = (s: { auth: AuthState }) => s.auth.permissions;
export const selectCurrentRole      = (s: { auth: AuthState }) => s.auth.user?.roleSlug;
export const selectIsSuperAdmin     = (s: { auth: AuthState }) => s.auth.user?.isSuperAdmin ?? false;
export const selectEmployeeId       = (s: { auth: AuthState }) => s.auth.user?.employeeId ?? null;
export const selectActiveCompanyId  = (s: { auth: AuthState }) => s.auth.activeCompanyId;
export const selectManagedCompanies = (s: { auth: AuthState }) => s.auth.user?.managedCompanies ?? [];
export const selectActiveCompany    = (s: { auth: AuthState }) => {
  const id      = s.auth.activeCompanyId;
  const managed = s.auth.user?.managedCompanies ?? [];
  return managed.find(c => c.id === id) ?? null;
};
