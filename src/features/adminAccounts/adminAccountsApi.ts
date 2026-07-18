import { axiosClient } from "@/lib/api/axiosClient";

import type {
  AdminAccountListQuery,
  AdminAccountListResponse,
  AdminAccountMutationResponse,
  ManagedAdminRole,
  TemporaryAdminPasswordResponse,
} from "./adminAccountTypes";

export async function listAdminAccounts(
  query: AdminAccountListQuery,
  signal?: AbortSignal,
): Promise<AdminAccountListResponse> {
  const response = await axiosClient.get<AdminAccountListResponse>(
    "/admin/accounts",
    { params: query, signal },
  );
  return response.data;
}

export async function createAdminAccount(payload: {
  username: string;
  role: ManagedAdminRole;
  currentPassword: string;
}): Promise<TemporaryAdminPasswordResponse> {
  const response = await axiosClient.post<TemporaryAdminPasswordResponse>(
    "/admin/accounts",
    payload,
  );
  return response.data;
}

export async function changeAdminAccountRole(
  id: string,
  payload: {
    role: ManagedAdminRole;
    currentPassword: string;
    expectedUpdatedAt: string;
  },
): Promise<AdminAccountMutationResponse> {
  const response = await axiosClient.patch<AdminAccountMutationResponse>(
    `/admin/accounts/${id}/role`,
    payload,
  );
  return response.data;
}

export async function changeAdminAccountStatus(
  id: string,
  payload: {
    status: "ACTIVE" | "DISABLED";
    currentPassword: string;
    expectedUpdatedAt: string;
  },
): Promise<AdminAccountMutationResponse> {
  const response = await axiosClient.patch<AdminAccountMutationResponse>(
    `/admin/accounts/${id}/status`,
    payload,
  );
  return response.data;
}

export async function revokeAdminAccountSessions(
  id: string,
  currentPassword: string,
): Promise<AdminAccountMutationResponse> {
  const response = await axiosClient.post<AdminAccountMutationResponse>(
    `/admin/accounts/${id}/revoke-sessions`,
    { currentPassword },
  );
  return response.data;
}

export async function resetAdminAccountPassword(
  id: string,
  payload: { currentPassword: string; expectedUpdatedAt: string },
): Promise<TemporaryAdminPasswordResponse> {
  const response = await axiosClient.post<TemporaryAdminPasswordResponse>(
    `/admin/accounts/${id}/reset-password`,
    payload,
  );
  return response.data;
}

export async function deleteAdminAccount(
  id: string,
  payload: {
    currentPassword: string;
    confirmUsername: string;
    expectedUpdatedAt: string;
  },
): Promise<AdminAccountMutationResponse> {
  const response = await axiosClient.delete<AdminAccountMutationResponse>(
    `/admin/accounts/${id}`,
    { data: payload },
  );
  return response.data;
}
