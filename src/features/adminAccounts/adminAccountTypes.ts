import type { AdminRole, AdminStatus } from "@/features/auth/authTypes";

export type ManagedAdminRole = Exclude<AdminRole, "OWNER">;

export type ManagedAdminAccount = {
  id: string;
  username: string;
  role: AdminRole;
  status: AdminStatus;
  mustChangePassword: boolean;
  activeSessionCount: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  temporaryPasswordExpiresAt: string | null;
  deletedAt: string | null;
};

export type AdminAccountListResponse = {
  items: ManagedAdminAccount[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type AdminAccountListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminRole | "";
  status?: AdminStatus | "";
  includeDeleted?: boolean;
  sortBy?: "createdAt" | "username" | "role" | "status" | "lastLoginAt";
  sortOrder?: "asc" | "desc";
};

export type AdminAccountMutationResponse = {
  message: string;
  account?: ManagedAdminAccount;
  revokedSessionCount?: number;
};

export type TemporaryAdminPasswordResponse = {
  account: ManagedAdminAccount;
  temporaryPassword: string;
};
