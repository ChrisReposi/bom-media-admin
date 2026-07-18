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

import {
  clearCredentials,
  setCredentials,
  updateTokens,
} from "@/features/auth/authSlice";
import {
  getAuthCrossTabAction,
  subscribeAuthEvents,
} from "@/features/auth/authCrossTab";
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
    adminId: store.getState().auth.admin?.id ?? null,
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

subscribeAuthEvents((event) => {
  const currentAdminId = store.getState().auth.admin?.id ?? null;
  const action = getAuthCrossTabAction(currentAdminId, event);
  if (action === "clear") {
    const reason = event.type === "AUTH_CLEARED" ? event.reason : undefined;
    store.dispatch(clearCredentials(reason));
    void persistor.flush().then(() => {
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.assign("/login");
      }
    });
    return;
  }

  if (action === "update" && event.type === "AUTH_UPDATED") {
    store.dispatch(updateTokens({ admin: event.admin, tokens: event.tokens }));
    return;
  }

  if (event.type === "AUTH_CLEARED") return;
  store.dispatch(setCredentials({ admin: event.admin, tokens: event.tokens }));
  void persistor.flush().then(() => {
    if (typeof window !== "undefined") window.location.reload();
  });
});

store.subscribe(() => {
  setAuthAccessToken(store.getState().auth.accessToken);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
