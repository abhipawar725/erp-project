import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";

// redux-persist imports
import {
  persistStore,
  persistReducer,
} from "redux-persist";

import storage from "./storage";

/**
 * =========================
 * PERSIST CONFIG
 * =========================
 */
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"], // only persist auth
};

/**
 * =========================
 * ROOT REDUCER
 * =========================
 */
const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
});

/**
 * =========================
 * PERSISTED REDUCER
 * =========================
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * =========================
 * STORE
 * =========================
 */
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // REQUIRED for redux-persist
    }),
  devTools: process.env.NODE_ENV !== "production",
});

/**
 * =========================
 * PERSISTOR
 * =========================
 */
export const persistor = persistStore(store);

/**
 * =========================
 * TYPES
 * =========================
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * =========================
 * HOOKS
 * =========================
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;