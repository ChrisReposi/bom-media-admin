import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import { normalizeApiError, type NormalizedApiError } from "@/lib/api/apiError";

import { loginAdmin, logoutAdmin, refreshAdminSession } from "./authApi";
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
    return await loginAdmin(payload);
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
    return await refreshAdminSession(payload);
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const logoutAdminThunk = createAsyncThunk<
  LogoutAdminThunkResult,
  void,
  { state: AuthThunkState }
>("auth/logoutAdmin", async (_, { getState }) => {
  const refreshToken = getState().auth.refreshToken;

  if (!refreshToken) {
    return {
      revokeAttempted: false,
      revokeConfirmed: false,
      message: "Đã đăng xuất khỏi trình duyệt này.",
    };
  }

  try {
    const response: LogoutAdminResponse = await logoutAdmin({ refreshToken });

    return {
      revokeAttempted: true,
      revokeConfirmed: true,
      message: response.message || "Đã đăng xuất.",
    };
  } catch (error) {
    const normalizedError = normalizeApiError(error);
    const cannotConfirmMessage =
      "Đã đăng xuất khỏi trình duyệt này. Không thể xác nhận thu hồi phiên trên máy chủ, vui lòng đăng nhập lại nếu cần.";

    return {
      revokeAttempted: true,
      revokeConfirmed: false,
      message: normalizedError.isRateLimitError
        ? "Đã đăng xuất khỏi trình duyệt này. Có quá nhiều yêu cầu nên chưa thể xác nhận thu hồi phiên trên máy chủ."
        : cannotConfirmMessage,
    };
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
      });
  },
});

export const {
  clearCredentials,
  setAuthChecking,
  setAuthError,
  setCredentials,
  updateTokens,
} = authSlice.actions;
export const authReducer = authSlice.reducer;
