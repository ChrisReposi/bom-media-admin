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

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<string> | null = null;

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
  const { accessToken } = getAuthSessionSnapshot();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (!error.response || error.response.status !== 401 || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableAxiosRequestConfig;

    if (originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (!getAuthSessionSnapshot().refreshToken) {
      handleRefreshFailure();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    let nextAccessToken: string;

    try {
      nextAccessToken = await refreshAccessTokenOnce();
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }

    originalRequest.headers = AxiosHeaders.from(originalRequest.headers);
    originalRequest.headers.set("Authorization", `Bearer ${nextAccessToken}`);

    return axiosClient(originalRequest);
  },
);

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
    throw new Error("Missing refresh token.");
  }

  try {
    const response = await axiosBaseClient.post<RefreshAdminTokenResponse>(
      "/admin/auth/refresh",
      { refreshToken },
    );

    updateAuthSessionFromRefresh(response.data);

    return response.data.tokens.accessToken;
  } catch (error) {
    const normalizedError = normalizeApiError(error);

    if (normalizedError.isAuthError) {
      handleRefreshFailure(normalizedError.message);
    }

    throw error;
  }
}

function handleRefreshFailure(
  reason = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
): void {
  clearAuthSession(reason);

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}
