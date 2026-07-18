import { useAppSelector } from "@/store/hooks";

import { can, type AdminPermission } from "./adminPermissions";

export function useAdminPermission(permission: AdminPermission): boolean {
  const role = useAppSelector((state) => state.auth.admin?.role);
  return can(role, permission);
}
