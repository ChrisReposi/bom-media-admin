import { combineReducers } from "@reduxjs/toolkit";

import { authReducer } from "@/features/auth/authSlice";
import themeReducer from "@/features/theme/themeSlice";

export const rootReducer = combineReducers({
  auth: authReducer,
  theme: themeReducer,
});

export type RootReducerState = ReturnType<typeof rootReducer>;
