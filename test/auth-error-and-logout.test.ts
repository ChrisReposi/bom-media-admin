import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getLogoutFailurePolicy } from "../src/features/auth/logoutPolicy";
import { normalizeApiError } from "../src/lib/api/apiError";

function fakeAxiosError(status: number): unknown {
  return {
    isAxiosError: true,
    name: "AxiosError",
    message: "request failed",
    config: {},
    response: {
      status,
      data: {},
      headers: {},
      config: {},
      statusText: "error",
    },
    toJSON: () => ({}),
  };
}

describe("auth error and logout policy", () => {
  it("does not treat permission 403 as a session failure", () => {
    const error = normalizeApiError(fakeAxiosError(403));
    const policy = getLogoutFailurePolicy(error);

    assert.equal(error.isAuthError, false);
    assert.equal(policy.clearLocalSession, false);
    assert.equal(policy.canRetry, true);
  });

  it("clears local auth only when logout confirms the session is invalid", () => {
    const error = normalizeApiError(fakeAxiosError(401));
    const policy = getLogoutFailurePolicy(error);

    assert.equal(error.isAuthError, true);
    assert.equal(policy.clearLocalSession, true);
    assert.equal(policy.allowExplicitLocalClear, false);
  });

  it("preserves local auth and offers retry/local-clear on server failure", () => {
    const error = normalizeApiError(fakeAxiosError(503));
    const policy = getLogoutFailurePolicy(error);

    assert.equal(policy.clearLocalSession, false);
    assert.equal(policy.canRetry, true);
    assert.equal(policy.allowExplicitLocalClear, true);
    assert.equal(error.isServerError, true);
  });
});
