import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  sidebarCollapsed: boolean;
  pageTitle: string;
  breadcrumb: string;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  pageTitle: 'Dashboard',
  breadcrumb: 'Overview',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    setPageTitle(state, action: PayloadAction<{ title: string; breadcrumb?: string }>) {
      state.pageTitle = action.payload.title;
      state.breadcrumb = action.payload.breadcrumb || '';
    },
  },
});

export const { toggleSidebar, setSidebarCollapsed, setPageTitle } = uiSlice.actions;
export default uiSlice.reducer;