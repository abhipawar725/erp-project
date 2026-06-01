import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User }            from '../../types/auth.types';

const initialState: AuthState = {
  user:            null,
  accessToken:     null,
  isAuthenticated: false,
  permissions:     [],
  platformToken:   null,   // ← Option B: preserved original super admin token
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // ── Regular login ──────────────────────────────────────────────────────
    setCredentials(state, action: PayloadAction<{ user: User; accessToken: string; permissions?: string[] }>) {
      state.user            = action.payload.user;
      state.accessToken     = action.payload.accessToken;
      state.isAuthenticated = true;
      state.permissions     = action.payload.permissions || [];
      // Store as platform token for super admin (so exit-company can restore it)
      if (action.payload.user.isSuperAdmin) {
        state.platformToken = action.payload.accessToken;
      }
      // setAccessToken(action.payload.accessToken);
    },

    updateToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      // setAccessToken(action.payload);
    },

    clearCredentials(state) {
      state.user            = null;
      state.accessToken     = null;
      state.isAuthenticated = false;
      state.permissions     = [];
      state.platformToken   = null;
      // setAccessToken(null);
    },

    setPermissions(state, action: PayloadAction<string[]>) {
      state.permissions = action.payload;
    },

    // ── Option B: switch into a company ───────────────────────────────────
    // Called after POST /api/super/switch-company/:id succeeds.
    // Swaps the active token to the scoped token but preserves the platform token.
    switchToCompany(state, action: PayloadAction<{
      scopedToken:   string;
      companyId:     number;
      companyName:   string;
    }>) {
      if (!state.user) return;

      // Preserve the original platform token if not already saved
      if (!state.platformToken) {
        state.platformToken = state.accessToken;
      }

      // Update active token to scoped token
      state.accessToken = action.payload.scopedToken;
      // setAccessToken(action.payload.scopedToken);

      // Update user context so useSelector gives correct values
      state.user = {
        ...state.user,
        viewingCompanyId:   action.payload.companyId,
        viewingCompanyName: action.payload.companyName,
      };
    },

    // ── Option B: exit company view ───────────────────────────────────────
    // Called after POST /api/super/exit-company succeeds.
    // Restores the platform token and clears viewingCompanyId.
    exitCompany(state, action: PayloadAction<{ platformToken: string }>) {
      if (!state.user) return;

      const token = action.payload.platformToken || state.platformToken;
      if (token) {
        state.accessToken = token;
        // setAccessToken(token);
      }

      state.user = {
        ...state.user,
        viewingCompanyId:   null,
        viewingCompanyName: null,
      };
    },
  },
});

export const {
  setCredentials, updateToken, clearCredentials, setPermissions,
  switchToCompany, exitCompany,
} = authSlice.actions;

export default authSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectUser             = (s: { auth: AuthState }) => s.auth.user;
export const selectIsAuthenticated  = (s: { auth: AuthState }) => s.auth.isAuthenticated;
export const selectPermissions      = (s: { auth: AuthState }) => s.auth.permissions;
export const selectCurrentRole      = (s: { auth: AuthState }) => s.auth.user?.roleSlug;
export const selectIsSuperAdmin     = (s: { auth: AuthState }) => s.auth.user?.isSuperAdmin ?? false;
export const selectIsViewingCompany = (s: { auth: AuthState }) => !!(s.auth.user?.viewingCompanyId);
export const selectViewingCompany   = (s: { auth: AuthState }) => ({
  id:   s.auth.user?.viewingCompanyId   ?? null,
  name: s.auth.user?.viewingCompanyName ?? null,
});