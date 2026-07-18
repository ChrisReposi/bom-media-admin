import { normalizeApiError } from "@/lib/api/apiError";

export const WEBSITE_VIDEO_ASSIGNMENT_ERROR_CODE =
  "VIDEO_NOT_ACTIVE_FOR_WEBSITE";

export function isWebsiteVideoAssignmentError(error: unknown): boolean {
  const normalized = normalizeApiError(error);
  return (
    normalized.code === WEBSITE_VIDEO_ASSIGNMENT_ERROR_CODE ||
    normalized.message.includes("not actively assigned to this website")
  );
}

export function reconcileAssignmentErrorSelection(
  selectedVideoIds: string[],
  error: unknown,
): string[] {
  const details = normalizeApiError(error).details;
  const invalidVideoIds = details?.invalidVideoIds;

  if (!Array.isArray(invalidVideoIds)) {
    return [];
  }

  const invalidVideoIdSet = new Set(
    invalidVideoIds.filter(
      (value): value is string => typeof value === "string",
    ),
  );
  return selectedVideoIds.filter((videoId) => !invalidVideoIdSet.has(videoId));
}

export function isCurrentWebsiteVideoResponse(input: {
  requestVersion: number;
  currentVersion: number;
  requestWebsiteId: string;
  currentWebsiteId: string;
}): boolean {
  return (
    input.requestVersion === input.currentVersion &&
    input.requestWebsiteId === input.currentWebsiteId
  );
}

export function getWebsiteVideoEmptyStateText(params: {
  searchQuery?: string;
  filterKey?: string;
  totalVideos: number;
  titleFilteredCount: number;
  shareableCount: number;
  sourceFilter: "all" | "link" | "embed" | "local-file" | "db-blob";
  activeAssignmentTotal: number;
  eligibleAssignmentTotal: number;
  hasSelectedWebsite: boolean;
}): string {
  if (!params.hasSelectedWebsite) {
    return "Vui lòng chọn website trước khi tải video.";
  }
  if (params.filterKey && params.titleFilteredCount === 0) {
    return `Không có video nào khớp với key "${params.filterKey}".`;
  }
  if (params.searchQuery && params.titleFilteredCount === 0) {
    return `Không tìm thấy video phù hợp với từ khóa "${params.searchQuery}".`;
  }
  if (params.totalVideos === 0) {
    if (params.activeAssignmentTotal === 0) {
      return "Website này chưa có video được gán để tạo share link. Hãy gán video cho website trước.";
    }
    if (params.eligibleAssignmentTotal === 0) {
      return "Website có video được gán nhưng chưa có video READY/playable để tạo share link.";
    }
    return "Assignment vừa thay đổi. Hãy tải lại danh sách video.";
  }
  if (params.sourceFilter === "link") return "Chưa có link video READY nào.";
  if (params.sourceFilter === "embed") return "Chưa có embed video READY nào.";
  if (params.sourceFilter === "local-file") {
    return "Chưa có server storage video READY nào.";
  }
  if (params.sourceFilter === "db-blob") {
    return "Chưa có database video READY nào.";
  }
  if (params.shareableCount === 0) {
    return "Chưa có video READY có thể chia sẻ.";
  }
  return "Không có video phù hợp với bộ lọc hiện tại.";
}
