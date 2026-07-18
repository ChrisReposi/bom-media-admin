import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CANONICAL_ERROR_MESSAGES,
  getCanonicalErrorMessage,
  getCanonicalOutcomeToast,
  summarizeEvidenceSnapshot,
} from "../src/features/websites/canonicalShareLinkPolicy";
import { normalizePublicShareUrl } from "../src/features/websites/shareLinkUrlUtils";

describe("canonical outcome messaging", () => {
  it("distinguishes CREATED from REUSED with the specified copy", () => {
    assert.equal(getCanonicalOutcomeToast("CREATED"), "Đã tạo URL canonical.");
    assert.equal(
      getCanonicalOutcomeToast("REUSED"),
      "Đã sử dụng lại URL canonical hiện có.",
    );
    assert.notEqual(
      getCanonicalOutcomeToast("CREATED"),
      getCanonicalOutcomeToast("REUSED"),
    );
  });

  it("maps every stable backend code and falls back safely", () => {
    for (const code of [
      "CANONICAL_LINK_REVOKED",
      "CANONICAL_LINK_INACTIVE",
      "CANONICAL_DOMAIN_UNAVAILABLE",
      "CANONICAL_EVIDENCE_DRIFT",
      "CANONICAL_VIDEO_NOT_SHAREABLE",
      "DOMAIN_HAS_ACTIVE_CANONICAL_LINKS",
      "VIDEO_HAS_CANONICAL_SHARE_LINK",
    ]) {
      const message = getCanonicalErrorMessage(code, "fallback");
      assert.equal(message, CANONICAL_ERROR_MESSAGES[code]);
      assert.notEqual(message, "fallback");
    }
    assert.equal(getCanonicalErrorMessage("UNKNOWN_CODE", "fb"), "fb");
    assert.equal(getCanonicalErrorMessage(undefined, "fb"), "fb");
  });
});

describe("evidence snapshot summary", () => {
  it("summarizes safe fields and truncates the checksum", () => {
    const summary = summarizeEvidenceSnapshot({
      sourceType: "LOCAL_FILE",
      durationSeconds: 61,
      checksumSha256: "abcdef0123456789abcdef0123456789",
      snapshotAt: "2026-07-18T00:00:00.000Z",
    });
    assert.ok(summary);
    assert.ok(summary.includes("LOCAL_FILE"));
    assert.ok(summary.includes("61s"));
    assert.ok(summary.includes("abcdef012345…"));
    assert.ok(!summary.includes("abcdef0123456789abcdef0123456789"));
  });

  it("is null-safe", () => {
    assert.equal(summarizeEvidenceSnapshot(null), null);
    assert.equal(summarizeEvidenceSnapshot({}), null);
  });
});

describe("public share URL normalization table", () => {
  const canonical = "https://plushcomedystudios.com/#/s/G3tqak0/videos";

  it("accepts every legacy input shape and emits one canonical output", () => {
    const legacyInputs = [
      "https://plushcomedystudios.com/s/G3tqak0#/videos",
      "https://plushcomedystudios.com/s/G3tqak0",
      "https://plushcomedystudios.com/#/s/G3tqak0/videos",
    ];
    for (const input of legacyInputs) {
      assert.equal(normalizePublicShareUrl(input), canonical, input);
    }
  });

  it("is idempotent on the canonical form (never rewrites a recorded URL)", () => {
    assert.equal(normalizePublicShareUrl(canonical), canonical);
    const local = "http://127.0.0.1:5500/#/s/abc1234/videos";
    assert.equal(normalizePublicShareUrl(local), local);
  });

  it("keeps deep-linked video ids stable", () => {
    assert.equal(
      normalizePublicShareUrl(
        "https://plushcomedystudios.com/s/G3tqak0#/videos/vid_1",
      ),
      "https://plushcomedystudios.com/#/s/G3tqak0/videos/vid_1",
    );
  });
});
