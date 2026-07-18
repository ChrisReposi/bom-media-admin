import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import { normalizeApiError, type NormalizedApiError } from "@/lib/api/apiError";

import { loginAdmin, logoutAdmin, refreshAdminSession } from "./authApi";
import { publishAuthEvent } from "./authCrossTab";
import { getLogoutFailurePolicy } from "./logoutPolicy";
import type {
  AdminAuthTokens,
  AuthState,
  LoginAdminRequest,
  LoginAdminResponse,
  LogoutAdminResponse,
  RefreshAdminTokenRequest,
  RefreshAdminTokenResponse,
  SafeAdmin,
} from "./authTypes";

const initialState: AuthState = {
  admin: null,
  accessToken: null,
  refreshToken: null,
  tokenType: null,
  expiresIn: null,
  status: "idle",
  error: null,
  isAuthenticated: false,
};

type AuthThunkState = {
  auth: AuthState;
};

export type LogoutAdminThunkResult = {
  revokeAttempted: boolean;
  revokeConfirmed: boolean;
  message: string;
};

export const loginAdminThunk = createAsyncThunk<
  LoginAdminResponse,
  LoginAdminRequest,
  { rejectValue: string }
>("auth/loginAdmin", async (payload, { rejectWithValue }) => {
  try {
    const response = await loginAdmin(payload);
    publishAuthEvent({
      type: "IDENTITY_CHANGED",
      admin: response.admin,
      tokens: response.tokens,
    });
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Đăng nhập thất bại. Vui lòng thử lại.";

    return rejectWithValue(message);
  }
});

export const bootstrapAdminSessionThunk = createAsyncThunk<
  RefreshAdminTokenResponse,
  RefreshAdminTokenRequest,
  { rejectValue: NormalizedApiError }
>("auth/bootstrapAdminSession", async (payload, { rejectWithValue }) => {
  try {
    const response = await refreshAdminSession(payload);
    publishAuthEvent({
      type: "AUTH_UPDATED",
      admin: response.admin,
      tokens: response.tokens,
    });
    return response;
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const logoutAdminThunk = createAsyncThunk<
  LogoutAdminThunkResult,
  void,
  { state: AuthThunkState; rejectValue: NormalizedApiError }
>("auth/logoutAdmin", async (_, { getState, rejectWithValue }) => {
  const refreshToken = getState().auth.refreshToken;

  if (!refreshToken) {
    return rejectWithValue({
      status: null,
      message: "Không có refresh token để xác nhận thu hồi phiên trên máy chủ.",
      isCanceled: false,
      isAuthError: false,
      isNetworkError: false,
      isRateLimitError: false,
      isServerError: false,
    });
  }

  try {
    const response: LogoutAdminResponse = await logoutAdmin({ refreshToken });
    publishAuthEvent({ type: "AUTH_CLEARED" });

    return {
      revokeAttempted: true,
      revokeConfirmed: true,
      message: response.message || "Đã đăng xuất.",
    };
  } catch (error) {
    const normalizedError = normalizeApiError(error);
    const policy = getLogoutFailurePolicy(normalizedError);

    if (policy.clearLocalSession) {
      publishAuthEvent({ type: "AUTH_CLEARED", reason: policy.message });
      return {
        revokeAttempted: true,
        revokeConfirmed: false,
        message: policy.message,
      };
    }

    return rejectWithValue(normalizedError);
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ admin: SafeAdmin; tokens: AdminAuthTokens }>,
    ) => {
      state.admin = action.payload.admin;
      state.accessToken = action.payload.tokens.accessToken;
      state.refreshToken = action.payload.tokens.refreshToken;
      state.tokenType = action.payload.tokens.tokenType;
      state.expiresIn = action.payload.tokens.expiresIn;
      state.status = "authenticated";
      state.error = null;
      state.isAuthenticated = true;
    },
    updateTokens: (
      state,
      action: PayloadAction<{ admin?: SafeAdmin; tokens: AdminAuthTokens }>,
    ) => {
      if (action.payload.admin) {
        state.admin = action.payload.admin;
      }
      state.accessToken = action.payload.tokens.accessToken;
      state.refreshToken = action.payload.tokens.refreshToken;
      state.tokenType = action.payload.tokens.tokenType;
      state.expiresIn = action.payload.tokens.expiresIn;
      state.status = "authenticated";
      state.error = null;
      state.isAuthenticated = true;
    },
    updateAdminProfile: (state, action: PayloadAction<SafeAdmin>) => {
      if (state.admin?.id === action.payload.id) {
        state.admin = action.payload;
      }
    },
    clearCredentials: (state, action: PayloadAction<string | undefined>) => {
      state.admin = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.tokenType = null;
      state.expiresIn = null;
      state.status = action.payload ? "error" : "idle";
      state.error = action.payload ?? null;
      state.isAuthenticated = false;
    },
    setAuthChecking: (state) => {
      state.status = "checking";
      state.error = null;
    },
    setAuthError: (state, action: PayloadAction<string>) => {
      state.status = "error";
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAdminThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginAdminThunk.fulfilled, (state, action) => {
        state.admin = action.payload.admin;
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
        state.tokenType = action.payload.tokens.tokenType;
        state.expiresIn = action.payload.tokens.expiresIn;
        state.status = "authenticated";
        state.error = null;
        state.isAuthenticated = true;
      })
      .addCase(loginAdminThunk.rejected, (state, action) => {
        state.admin = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.tokenType = null;
        state.expiresIn = null;
        state.status = "error";
        state.error =
          action.payload ??
          "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.";
        state.isAuthenticated = false;
      })
      .addCase(bootstrapAdminSessionThunk.pending, (state) => {
        state.status = "checking";
        state.error = null;
      })
      .addCase(bootstrapAdminSessionThunk.fulfilled, (state, action) => {
        state.admin = action.payload.admin;
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
        state.tokenType = action.payload.tokens.tokenType;
        state.expiresIn = action.payload.tokens.expiresIn;
        state.status = "authenticated";
        state.error = null;
        state.isAuthenticated = true;
      })
      .addCase(bootstrapAdminSessionThunk.rejected, (state, action) => {
        if (action.payload?.isAuthError) {
          state.admin = null;
          state.accessToken = null;
          state.refreshToken = null;
          state.tokenType = null;
          state.expiresIn = null;
          state.isAuthenticated = false;
        }

        state.status = "error";
        state.error =
          action.payload?.message ??
          "Không thể khôi phục phiên đăng nhập. Vui lòng thử lại.";
      })
      .addCase(logoutAdminThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(logoutAdminThunk.fulfilled, (state) => {
        state.admin = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.tokenType = null;
        state.expiresIn = null;
        state.status = "idle";
        state.error = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutAdminThunk.rejected, (state, action) => {
        state.status = state.isAuthenticated ? "authenticated" : state.status;
        state.error =
          action.payload?.message ??
          "Không thể xác nhận đăng xuất với máy chủ. Vui lòng thử lại.";
      });
  },
});

export const {
  clearCredentials,
  setAuthChecking,
  setAuthError,
  setCredentials,
  updateAdminProfile,
  updateTokens,
} = authSlice.actions;
export const authReducer = authSlice.reducer;
