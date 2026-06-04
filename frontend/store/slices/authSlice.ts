import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthUser, AuthState } from '../../types/auth.types';
// import { setAccessToken } from '../../services/api/client';

const initialState: AuthState = {
  user:            null,
  accessToken:     null,
  isAuthenticated: false,
  permissions:     [],
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: AuthUser; accessToken: string }>) {
      state.user            = action.payload.user;
      state.accessToken     = action.payload.accessToken;
      state.isAuthenticated = true;
      state.permissions     = action.payload.user.permissions ?? [];
      // setAccessToken(action.payload.accessToken);
    },
    updateToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      // setAccessToken(action.payload);
    },
    clearCredentials(state) {
      state.user = null; state.accessToken = null;
      state.isAuthenticated = false; state.permissions = [];
      // setAccessToken(null);
    },
    setPermissions(state, action: PayloadAction<string[]>) {
      state.permissions = action.payload;
      if (state.user) state.user.permissions = action.payload;
    },
  },
});

export const { setCredentials, updateToken, clearCredentials, setPermissions } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectUser            = (s: { auth: AuthState }) => s.auth.user;
export const selectIsAuthenticated = (s: { auth: AuthState }) => s.auth.isAuthenticated;
export const selectPermissions     = (s: { auth: AuthState }) => s.auth.permissions;
export const selectCurrentRole     = (s: { auth: AuthState }) => s.auth.user?.roleSlug;
export const selectIsSuperAdmin    = (s: { auth: AuthState }) => s.auth.user?.isSuperAdmin ?? false;
export const selectEmployeeId      = (s: { auth: AuthState }) => s.auth.user?.employeeId ?? null;
export const selectHasPermission   = (slug: string) =>
  (s: { auth: AuthState }): boolean => {
    const u = s.auth.user;
    if (!u) return false;
    if (u.isSuperAdmin) return true;
    return s.auth.permissions.includes(slug) || s.auth.permissions.includes('*');
  };