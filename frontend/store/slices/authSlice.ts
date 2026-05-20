import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../../types/auth.types';
// import { setAccessToken } from '../../services/api/client';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  permissions: [],
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User; accessToken: string; permissions?: string[] }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.permissions = action.payload.permissions ?? [];
      // setAccessToken(action.payload.accessToken);
    },
    updateToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      // setAccessToken(action.payload);
    },
    clearCredentials(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.permissions = [];
      // setAccessToken(null);
    },
        // Called by AuthProvider when session restore is complete but no valid session
    setInitialized(state) {
    },
    setPermissions(state, action: PayloadAction<string[]>) {
      state.permissions = action.payload;
    },
  },
});

export const { setCredentials, updateToken, clearCredentials, setPermissions } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectCurrentRole = (state: { auth: AuthState }) => state.auth.user?.roleSlug;
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken;