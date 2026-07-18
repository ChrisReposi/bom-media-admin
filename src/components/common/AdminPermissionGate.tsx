import React, { type ReactNode } from "react";

import { can, type AdminPermission } from "@/features/auth/adminPermissions";
import type { AdminRole } from "@/features/auth/authTypes";

type AdminPermissionGateProps = {
  role: AdminRole | null | undefined;
  permission: AdminPermission;
  children: ReactNode;
  fallback?: ReactNode;
};

export function AdminPermissionGate({
  role,
  permission,
  children,
  fallback = null,
}: AdminPermissionGateProps) {
  return can(role, permission) ? <>{children}</> : <>{fallback}</>;
}
