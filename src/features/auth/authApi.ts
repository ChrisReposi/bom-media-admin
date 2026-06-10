import axios from "axios";

import { axiosBaseClient, axiosClient } from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/api/apiError";

import { getAuthSessionSnapshot } from "./authSessionAccessor";
import type {
  LoginAdminRequest,
  LoginAdminResponse,
  LogoutAdminRequest,
  LogoutAdminResponse,
  MeAdminResponse,
  RefreshAdminTokenRequest,
  RefreshAdminTokenResponse,
  ChangeAdminPasswordRequest,
  ChangeAdminPasswordResponse,
} from "./authTypes";

function readApiMessage(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("message" in data)) {
    return null;
  }

  const message = (data as { message?: unknown }).message;

  if (typeof message === "string") {
    return message;
  }

  if (
    Array.isArray(message) &&
    message.every((item) => typeof item === "string")
  ) {
    return message.join(" ");
  }

  return null;
}

function getSafeLoginErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Dang nhap that bai. Vui long thu lai.";
  }

  if (!error.response) {
    return getApiErrorMessage(error);
  }

  if (error.response.status === 401) {
    return "Ten dang nhap hoac mat khau khong dung.";
  }

  return readApiMessage(error.response.data) ?? getApiErrorMessage(error);
}

export async function loginAdmin(
  payload: LoginAdminRequest,
): Promise<LoginAdminResponse> {
  try {
    const response = await axiosBaseClient.post<LoginAdminResponse>(
      "/admin/auth/login",
      payload,
    );

    return response.data;
  } catch (error) {
    throw new Error(getSafeLoginErrorMessage(error));
  }
}

export async function refreshAdminSession(
  payload: RefreshAdminTokenRequest,
): Promise<RefreshAdminTokenResponse> {
  const response = await axiosBaseClient.post<RefreshAdminTokenResponse>(
    "/admin/auth/refresh",
    payload,
  );

  return response.data;
}

export async function getCurrentAdmin(): Promise<MeAdminResponse> {
  const { accessToken } = getAuthSessionSnapshot();
  const response = await axiosBaseClient.get<MeAdminResponse>(
    "/admin/auth/me",
    {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    },
  );

  return response.data;
}

export async function logoutAdmin(
  payload: LogoutAdminRequest,
): Promise<LogoutAdminResponse> {
  const response = await axiosBaseClient.post<LogoutAdminResponse>(
    "/admin/auth/logout",
    payload,
  );

  return response.data;
}

export async function changeAdminPassword(
  payload: ChangeAdminPasswordRequest,
): Promise<ChangeAdminPasswordResponse> {
  const response = await axiosClient.post<ChangeAdminPasswordResponse>(
    "/admin/auth/change-password",
    payload,
  );

  return response.data;
}
