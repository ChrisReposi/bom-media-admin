import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import {
  clearAuthSession,
  getAuthSessionSnapshot,
  updateAuthSessionFromRefresh,
} from "@/features/auth/authSessionAccessor";
import type { RefreshAdminTokenResponse } from "@/features/auth/authTypes";
import { normalizeApiError } from "@/lib/api/apiError";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
const SESSION_EXPIRED_MESSAGE =
  "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
const SESSION_REVOKED_MESSAGE =
  "Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.";

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _authAdminId?: string | null;
  _authSessionVersion?: number;
};

let refreshPromise: Promise<string> | null = null;
let observedAccessToken: string | null = null;
let authSessionVersion = 0;
let hasHandledRefreshFailure = false;

export const axiosBaseClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

axiosClient.interceptors.request.use((config) => {
  const { adminId, accessToken, refreshToken } = getAuthSessionSnapshot();
  const retryableConfig = config as RetryableAxiosRequestConfig;

  retryableConfig._authAdminId = adminId;
  retryableConfig._authSessionVersion =
    synchronizeAuthSessionVersion(accessToken);
  retryableConfig.headers = AxiosHeaders.from(retryableConfig.headers);

  if (accessToken) {
    retryableConfig.headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    retryableConfig.headers.delete("Authorization");
  }

  if (accessToken && refreshToken) {
    hasHandledRefreshFailure = false;
  }

  return retryableConfig;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    if (!error.response || error.response.status !== 401 || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableAxiosRequestConfig;

    if (originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (originalRequest.signal?.aborted) {
      return Promise.reject(new axios.CanceledError("Request canceled."));
    }

    originalRequest._retry = true;

    const currentSession = getAuthSessionSnapshot();
    const currentSessionVersion = synchronizeAuthSessionVersion(
      currentSession.accessToken,
    );

    if (
      originalRequest._authAdminId !== undefined &&
      originalRequest._authAdminId !== currentSession.adminId
    ) {
      return Promise.reject(new axios.CanceledError("Auth session changed."));
    }

    if (
      originalRequest._authSessionVersion !== undefined &&
      originalRequest._authSessionVersion < currentSessionVersion
    ) {
      if (currentSession.accessToken) {
        setRequestAccessToken(originalRequest, currentSession.accessToken);
        return axiosClient(originalRequest);
      }

      return Promise.reject(new axios.CanceledError("Auth session changed."));
    }

    if (!currentSession.refreshToken) {
      handleRefreshFailure();
      return Promise.reject(error);
    }

    try {
      const nextAccessToken = await refreshAccessTokenOnce();

      if (originalRequest.signal?.aborted) {
        return Promise.reject(new axios.CanceledError("Request canceled."));
      }

      setRequestAccessToken(originalRequest, nextAccessToken);
      return axiosClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

function synchronizeAuthSessionVersion(accessToken: string | null): number {
  if (accessToken !== observedAccessToken) {
    return advanceAuthSessionVersion(accessToken);
  }

  return authSessionVersion;
}

function advanceAuthSessionVersion(accessToken: string | null): number {
  observedAccessToken = accessToken;
  authSessionVersion += 1;
  return authSessionVersion;
}

function setRequestAccessToken(
  request: RetryableAxiosRequestConfig,
  accessToken: string,
): void {
  request.headers = AxiosHeaders.from(request.headers);
  request.headers.set("Authorization", `Bearer ${accessToken}`);
  request._authSessionVersion = synchronizeAuthSessionVersion(accessToken);
}

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  return (
    url.includes("/admin/auth/login") ||
    url.includes("/admin/auth/refresh") ||
    url.includes("/admin/auth/logout")
  );
}

function refreshAccessTokenOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function refreshAccessToken(): Promise<string> {
  const { refreshToken } = getAuthSessionSnapshot();

  if (!refreshToken) {
    handleRefreshFailure();
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  try {
    const response = await axiosBaseClient.post<RefreshAdminTokenResponse>(
      "/admin/auth/refresh",
      { refreshToken },
    );

    if (getAuthSessionSnapshot().refreshToken !== refreshToken) {
      throw new axios.CanceledError("Auth session changed.");
    }

    updateAuthSessionFromRefresh(response.data);
    advanceAuthSessionVersion(response.data.tokens.accessToken);
    hasHandledRefreshFailure = false;

    return response.data.tokens.accessToken;
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error;
    }

    const normalizedError = normalizeApiError(error);

    if (normalizedError.isAuthError) {
      handleRefreshFailure(
        normalizedError.status === 403
          ? SESSION_REVOKED_MESSAGE
          : SESSION_EXPIRED_MESSAGE,
      );
    }

    throw error;
  }
}

function handleRefreshFailure(reason = SESSION_EXPIRED_MESSAGE): void {
  if (hasHandledRefreshFailure) {
    return;
  }

  hasHandledRefreshFailure = true;
  advanceAuthSessionVersion(null);
  clearAuthSession(reason);
}
