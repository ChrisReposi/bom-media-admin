import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  CANONICAL_ERROR_MESSAGES,
  getCanonicalErrorMessage,
  getCanonicalOutcomeToast,
  summarizeEvidenceSnapshot,
} from "../src/features/websites/canonicalShareLinkPolicy";
import { normalizePublicShareUrl } from "../src/features/websites/shareLinkUrlUtils";

const source = (relativePath: string): string =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const websiteTypesSource = source("src/features/websites/websiteTypes.ts");
const canonicalTypeSource =
  websiteTypesSource.match(
    /export type CanonicalShareLinkResponse = \{[\s\S]*?\n\};/,
  )?.[0] ?? "";
const genericTypeSource =
  websiteTypesSource.match(
    /export type CreateShareLinkResponse = \{[\s\S]*?\n\};/,
  )?.[0] ?? "";
const canonicalCardSource = source(
  "src/features/dashboard/components/CanonicalShareLinkCard.tsx",
);
const genericCardSource = source(
  "src/features/dashboard/components/CreatedShareLinkCard.tsx",
);
const canonicalClientSources = [
  canonicalCardSource,
  source("src/features/websites/canonicalShareLinkPolicy.ts"),
  source("src/features/websites/websiteApi.ts"),
  source("src/features/dashboard/components/ShareLinkComposer.tsx"),
  source("src/pages/DashboardPage.tsx"),
].join("\n");

describe("canonical raw-token contract", () => {
  it("keeps rawToken absent from the canonical type and result card", () => {
    assert.ok(canonicalTypeSource, "canonical response type missing");
    assert.equal(/\brawToken\b/.test(canonicalTypeSource), false);
    assert.equal(/\btokenHash\b/.test(canonicalTypeSource), false);
    assert.equal(/\brawToken\b/.test(canonicalCardSource), false);
    assert.equal(canonicalCardSource.includes("result.publicUrl"), true);
    assert.equal(canonicalCardSource.includes("result.alias"), true);
  });

  it("keeps the generic review-bundle one-time token contract", () => {
    assert.ok(genericTypeSource, "generic response type missing");
    assert.equal(/\brawToken\b/.test(genericTypeSource), true);
    assert.equal(genericCardSource.includes("shareLink.rawToken"), true);
  });

  it("does not persist or log a canonical raw token", () => {
    assert.equal(/\brawToken\b/.test(canonicalClientSources), false);
    assert.equal(/\blocalStorage\b/.test(canonicalClientSources), false);
    assert.equal(/\bsessionStorage\b/.test(canonicalClientSources), false);
    assert.equal(
      /console\.(?:log|debug)\s*\(/.test(canonicalClientSources),
      false,
    );
  });

  it("retains the evidence disclaimer without a one-time-token section", () => {
    assert.equal(
      canonicalCardSource.includes("Nó không tự chứng minh quyền sở hữu"),
      true,
    );
    assert.equal(
      canonicalCardSource.includes("không bảo đảm kết quả xử lý DMCA"),
      true,
    );
    assert.equal(canonicalCardSource.includes("Raw token"), false);
  });
});

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
      "CANONICAL_EVIDENCE_INCOMPLETE",
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

  it("maps incomplete DB evidence to an actionable Vietnamese message", () => {
    const message = getCanonicalErrorMessage(
      "CANONICAL_EVIDENCE_INCOMPLETE",
      "fallback",
    );
    assert.equal(
      message,
      "Video lưu trong cơ sở dữ liệu chưa có mã kiểm tra toàn vẹn. Hãy hoàn tất bước bổ sung checksum trước khi tạo URL canonical.",
    );
    assert.notEqual(message, "fallback");
    assert.equal(
      /quyền sở hữu|bản quyền đã được chứng minh/i.test(message),
      false,
    );
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
