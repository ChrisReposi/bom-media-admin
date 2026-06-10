import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { persistor, store } from "@/store";

import ThemeSync from "@/components/common/ThemeSync";
import { AuthSessionBootstrap } from "@/features/auth/components/AuthSessionBootstrap";
import { App } from "./App";

export function AppProviders() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeSync />
        <AuthSessionBootstrap>
          <App />
        </AuthSessionBootstrap>
      </PersistGate>
    </Provider>
  );
}
