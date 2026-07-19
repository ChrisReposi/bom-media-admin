import type { CanonicalShareLinkResponse } from "./websiteTypes";

/**
 * Pure canonical-link presentation policy (Node-testable, no axios/Vite).
 * The canonical publicUrl is recorded in DMCA/provenance filings, so the UI
 * must show it byte-for-byte as the backend returned it — never rebuilt from
 * the currently preferred domain or the VITE_PUBLIC_SHARE_BASE_URL override.
 */

export const CANONICAL_ERROR_MESSAGES: Record<string, string> = {
  CANONICAL_LINK_REVOKED:
    "URL canonical đã bị thu hồi. Cần OWNER xem xét; hệ thống không tự tạo URL thay thế.",
  CANONICAL_LINK_INACTIVE:
    "URL canonical đang không hoạt động. Cần OWNER xem xét trước khi sử dụng lại.",
  CANONICAL_DOMAIN_UNAVAILABLE:
    "Domain của URL canonical không còn đúng trạng thái đã ghi nhận. Cần OWNER xem xét.",
  CANONICAL_EVIDENCE_DRIFT:
    "Nội dung video đã thay đổi so với snapshot canonical. Cần OWNER xem xét trước khi tái sử dụng URL.",
  CANONICAL_EVIDENCE_INCOMPLETE:
    "Video lưu trong cơ sở dữ liệu chưa có mã kiểm tra toàn vẹn. Hãy hoàn tất bước bổ sung checksum trước khi tạo URL canonical.",
  CANONICAL_VIDEO_NOT_SHAREABLE:
    "Video không còn đủ điều kiện chia sẻ trên website này. URL canonical hiện có được giữ nguyên.",
  DOMAIN_HAS_ACTIVE_CANONICAL_LINKS:
    "Domain đang gắn với URL canonical dùng cho hồ sơ bản quyền nên không thể thay đổi.",
  VIDEO_HAS_CANONICAL_SHARE_LINK:
    "Video đang gắn với URL canonical dùng cho hồ sơ bản quyền nên không thể xóa vĩnh viễn.",
};

export function getCanonicalErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  return (code && CANONICAL_ERROR_MESSAGES[code]) || fallback;
}

export function getCanonicalOutcomeToast(
  outcome: CanonicalShareLinkResponse["outcome"],
): string {
  return outcome === "CREATED"
    ? "Đã tạo URL canonical."
    : "Đã sử dụng lại URL canonical hiện có.";
}

/** Short, safe snapshot summary for the result card. Never includes tokens. */
export function summarizeEvidenceSnapshot(
  snapshot: CanonicalShareLinkResponse["evidenceSnapshot"],
): string | null {
  if (!snapshot) {
    return null;
  }

  const parts: string[] = [];
  if (typeof snapshot.sourceType === "string") {
    parts.push(snapshot.sourceType);
  }
  if (
    typeof snapshot.durationSeconds === "number" &&
    Number.isFinite(snapshot.durationSeconds)
  ) {
    parts.push(`${snapshot.durationSeconds}s`);
  }
  if (typeof snapshot.checksumSha256 === "string" && snapshot.checksumSha256) {
    parts.push(`sha256 ${snapshot.checksumSha256.slice(0, 12)}…`);
  }
  if (typeof snapshot.snapshotAt === "string") {
    parts.push(`chụp lúc ${snapshot.snapshotAt}`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}
