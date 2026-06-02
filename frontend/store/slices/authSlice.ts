import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User }            from '../../types/auth.types';
// import { setAccessToken }             from '../../services/api/client';

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
    setCredentials(
      state,
      action: PayloadAction<{ user: User; accessToken: string; permissions?: string[] }>
    ) {
      state.user            = action.payload.user;
      state.accessToken     = action.payload.accessToken;
      state.isAuthenticated = true;
      // Prefer permissions from user object (embedded in JWT response)
      state.permissions     = action.payload.user.permissions
        ?? action.payload.permissions
        ?? [];
      // setAccessToken(action.payload.accessToken);
    },

    updateToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      // setAccessToken(action.payload);
    },

    // Called after token refresh — re-embed permissions from new token response
    refreshPermissions(state, action: PayloadAction<string[]>) {
      state.permissions = action.payload;
      if (state.user) state.user.permissions = action.payload;
    },

    clearCredentials(state) {
      state.user            = null;
      state.accessToken     = null;
      state.isAuthenticated = false;
      state.permissions     = [];
      // setAccessToken(null);
    },

    setPermissions(state, action: PayloadAction<string[]>) {
      state.permissions = action.payload;
      if (state.user) state.user.permissions = action.payload;
    },
  },
});

export const {
  setCredentials, updateToken, clearCredentials,
  setPermissions, refreshPermissions,
} = authSlice.actions;

export default authSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectUser            = (s: { auth: AuthState }) => s.auth.user;
export const selectIsAuthenticated = (s: { auth: AuthState }) => s.auth.isAuthenticated;
export const selectPermissions     = (s: { auth: AuthState }) => s.auth.permissions;
export const selectCurrentRole     = (s: { auth: AuthState }) => s.auth.user?.roleSlug;
export const selectIsSuperAdmin    = (s: { auth: AuthState }) => s.auth.user?.isSuperAdmin ?? false;

// ─── Permission helpers ───────────────────────────────────────────────────────

/** Returns true if the user has the given permission slug OR is super admin */
export const selectHasPermission = (slug: string) =>
  (s: { auth: AuthState }): boolean => {
    const { user, permissions } = s.auth;
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return permissions.includes(slug) || permissions.includes('*');
  };

/** Returns true if user has ANY of the given slugs */
export const selectHasAnyPermission = (...slugs: string[]) =>
  (s: { auth: AuthState }): boolean => {
    const { user, permissions } = s.auth;
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return slugs.some(slug => permissions.includes(slug));
  };
