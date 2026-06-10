import { configureStore } from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
  type PersistConfig,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

import { clearCredentials, updateTokens } from "@/features/auth/authSlice";
import { configureAuthSessionHandlers } from "@/features/auth/authSessionAccessor";
import { setAuthAccessToken } from "@/features/auth/authTokenAccessor";

import { rootReducer, type RootReducerState } from "./rootReducer";

const persistConfig: PersistConfig<RootReducerState> = {
  key: "video-share-admin-web",
  storage,
  whitelist: ["auth"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

setAuthAccessToken(store.getState().auth.accessToken);

configureAuthSessionHandlers({
  getSnapshot: () => ({
    accessToken: store.getState().auth.accessToken,
    refreshToken: store.getState().auth.refreshToken,
  }),
  updateSession: (payload) => {
    store.dispatch(updateTokens(payload));
  },
  clearSession: (reason) => {
    store.dispatch(clearCredentials(reason));
  },
});

store.subscribe(() => {
  setAuthAccessToken(store.getState().auth.accessToken);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
