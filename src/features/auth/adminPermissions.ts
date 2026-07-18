import type { AdminRole } from "./authTypes";

export type AdminPermission =
  | "admin.read"
  | "website.write"
  | "domain.write"
  | "video.write"
  | "shareLink.write"
  | "upload.write"
  | "video.purge"
  | "adminAccount.read"
  | "adminAccount.create"
  | "adminAccount.updateRole"
  | "adminAccount.updateStatus"
  | "adminAccount.revokeSessions"
  | "adminAccount.resetPassword"
  | "adminAccount.delete";

const ADMIN_PERMISSIONS = [
  "admin.read",
  "website.write",
  "domain.write",
  "video.write",
  "shareLink.write",
  "upload.write",
] as const satisfies readonly AdminPermission[];

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  STAFF: new Set<AdminPermission>(["admin.read"]),
  ADMIN: new Set<AdminPermission>(ADMIN_PERMISSIONS),
  OWNER: new Set<AdminPermission>([
    ...ADMIN_PERMISSIONS,
    "video.purge",
    "adminAccount.read",
    "adminAccount.create",
    "adminAccount.updateRole",
    "adminAccount.updateStatus",
    "adminAccount.revokeSessions",
    "adminAccount.resetPassword",
    "adminAccount.delete",
  ]),
};

export function can(
  role: AdminRole | null | undefined,
  permission: AdminPermission,
): boolean {
  if (!role || !Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) {
    return false;
  }

  return ROLE_PERMISSIONS[role].has(permission);
}
