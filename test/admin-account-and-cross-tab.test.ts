import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getProtectedRouteRedirect } from "../src/app/routes/ProtectedRoute";
import { getAdminAccountErrorMessage } from "../src/features/adminAccounts/adminAccountPolicy";
import {
  getAuthCrossTabAction,
  readRefreshHandoff,
  withCrossTabRefreshLock,
  writeRefreshHandoff,
  type AuthCrossTabEvent,
} from "../src/features/auth/authCrossTab";
import type {
  AdminAuthTokens,
  SafeAdmin,
} from "../src/features/auth/authTypes";

const admin: SafeAdmin = {
  id: "admin-a",
  username: "owner",
  role: "OWNER",
  status: "ACTIVE",
  createdAt: "2026-07-16T00:00:00.000Z",
  lastLoginAt: null,
  mustChangePassword: false,
};
const tokens: AdminAuthTokens = {
  accessToken: "access",
  refreshToken: "refresh",
  tokenType: "Bearer",
  expiresIn: 900,
};

describe("admin account and auth browser policy", () => {
  it("redirects forced-password identities outside the business layout", () => {
    assert.equal(
      getProtectedRouteRedirect({
        isLoggedIn: true,
        mustChangePassword: true,
        pathname: "/settings",
      }),
      "/change-password-required",
    );
    assert.equal(
      getProtectedRouteRedirect({
        isLoggedIn: true,
        mustChangePassword: true,
        pathname: "/change-password-required",
      }),
      null,
    );
    assert.equal(
      getProtectedRouteRedirect({
        isLoggedIn: true,
        mustChangePassword: false,
        pathname: "/change-password-required",
      }),
      "/",
    );
  });

  it("maps stable account codes without parsing server English messages", () => {
    assert.equal(
      getAdminAccountErrorMessage({
        status: 409,
        code: "ADMIN_CONCURRENT_MUTATION",
        message: "server text changed",
        isCanceled: false,
        isAuthError: false,
        isNetworkError: false,
        isRateLimitError: false,
        isServerError: false,
      }),
      "Tài khoản vừa được thay đổi ở nơi khác. Danh sách đã được tải lại.",
    );
  });

  it("updates same identity, reloads changed identity, and clears logout tabs", () => {
    const update: AuthCrossTabEvent = {
      type: "AUTH_UPDATED",
      origin: "tab-b",
      admin,
      tokens,
    };
    assert.equal(getAuthCrossTabAction("admin-a", update), "update");
    assert.equal(
      getAuthCrossTabAction("admin-b", update),
      "replace-and-reload",
    );
    assert.equal(
      getAuthCrossTabAction("admin-a", {
        type: "AUTH_CLEARED",
        origin: "tab-b",
      }),
      "clear",
    );
  });

  it("serializes the localStorage lease fallback", async () => {
    const values = new Map<string, string>();
    const previous = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    let concurrent = 0;
    let maxConcurrent = 0;
    const operation = async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 30));
      concurrent -= 1;
    };
    try {
      await Promise.all([
        withCrossTabRefreshLock(operation),
        withCrossTabRefreshLock(operation),
      ]);
      assert.equal(maxConcurrent, 1);
    } finally {
      if (previous) Object.defineProperty(globalThis, "localStorage", previous);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });

  it("hands the rotated token to the lock loser without storing the old token", async () => {
    const values = new Map<string, string>();
    const previous = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    try {
      await writeRefreshHandoff("old-refresh-token", { admin, tokens });
      assert.deepEqual(await readRefreshHandoff("old-refresh-token"), {
        admin,
        tokens,
      });
      assert.equal(await readRefreshHandoff("different-token"), null);
      assert.equal(
        [...values.values()].some((value) =>
          value.includes("old-refresh-token"),
        ),
        false,
      );
    } finally {
      if (previous) Object.defineProperty(globalThis, "localStorage", previous);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});
