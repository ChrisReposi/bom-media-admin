import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AdminPermissionGate } from "../src/components/common/AdminPermissionGate";
import {
  can,
  type AdminPermission,
} from "../src/features/auth/adminPermissions";

const ADMIN_WRITE_PERMISSIONS: AdminPermission[] = [
  "website.write",
  "domain.write",
  "video.write",
  "shareLink.write",
  "upload.write",
];
const ACCOUNT_PERMISSIONS: AdminPermission[] = [
  "adminAccount.read",
  "adminAccount.create",
  "adminAccount.updateRole",
  "adminAccount.updateStatus",
  "adminAccount.revokeSessions",
  "adminAccount.resetPassword",
  "adminAccount.delete",
];

describe("admin permission policy", () => {
  it("keeps STAFF read-only, ADMIN write-capable, and purge OWNER-only", () => {
    assert.equal(can("STAFF", "admin.read"), true);
    for (const permission of ADMIN_WRITE_PERMISSIONS) {
      assert.equal(can("STAFF", permission), false);
      assert.equal(can("ADMIN", permission), true);
      assert.equal(can("OWNER", permission), true);
    }

    assert.equal(can("ADMIN", "video.purge"), false);
    assert.equal(can("OWNER", "video.purge"), true);
  });

  it("defaults missing and unknown roles to deny", () => {
    assert.equal(can(undefined, "admin.read"), false);
    assert.equal(can(null, "video.write"), false);
    assert.equal(can("UNKNOWN" as never, "admin.read"), false);
  });

  it("keeps every account-management permission OWNER-only", () => {
    for (const permission of ACCOUNT_PERMISSIONS) {
      assert.equal(can("OWNER", permission), true);
      assert.equal(can("ADMIN", permission), false);
      assert.equal(can("STAFF", permission), false);
      assert.equal(can(undefined, permission), false);
    }
  });

  it("blocks stale or deep-linked mutation content for STAFF", () => {
    const staffMarkup = renderToStaticMarkup(
      <AdminPermissionGate
        permission="video.write"
        role="STAFF"
        fallback={<span>permission denied</span>}
      >
        <form>mutation form</form>
      </AdminPermissionGate>,
    );
    const ownerPurgeMarkup = renderToStaticMarkup(
      <AdminPermissionGate permission="video.purge" role="OWNER">
        <button>purge</button>
      </AdminPermissionGate>,
    );
    const adminPurgeMarkup = renderToStaticMarkup(
      <AdminPermissionGate permission="video.purge" role="ADMIN">
        <button>purge</button>
      </AdminPermissionGate>,
    );

    assert.equal(staffMarkup.includes("mutation form"), false);
    assert.equal(staffMarkup.includes("permission denied"), true);
    assert.equal(ownerPurgeMarkup.includes("purge"), true);
    assert.equal(adminPurgeMarkup.includes("purge"), false);
  });
});
