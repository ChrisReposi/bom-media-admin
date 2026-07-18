import { Link2, Loader2, Search, X } from "lucide-react";
import type { FormEvent, KeyboardEvent } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VideoAsset } from "@/features/videos/videoTypes";
import type {
  CanonicalShareLinkResponse,
  CreateShareLinkResponse,
  Website,
} from "@/features/websites/websiteTypes";
import type {
  DashboardVideoSearchStatus,
  ShareLinkComposerPayload,
} from "../dashboardTypes";
import type { VideoSelectionMode } from "../dashboardSelectionPolicy";
import { ReadyVideoPicker } from "./ReadyVideoPicker";
import { WebsiteQuickSelect } from "./WebsiteQuickSelect";
import { CreatedShareLinkCard } from "./CreatedShareLinkCard";
import { CanonicalShareLinkCard } from "./CanonicalShareLinkCard";

type ShareLinkComposerProps = {
  websites: Website[];
  videos: VideoAsset[];
  totalVideos: number;
  activeAssignmentTotal: number;
  eligibleAssignmentTotal: number;
  selectedWebsiteId: string;
  selectedVideoIds: string[];
  videoSelectionMode: VideoSelectionMode;
  isSubmitting: boolean;
  isVideoRefreshing: boolean;
  isLoadingMoreVideos: boolean;
  hasMoreVideos: boolean;
  videoSearchQuery: string;
  videoFilterKey: string;
  videoSearchStatus?: DashboardVideoSearchStatus;
  videoSearchError?: string | null;
  videoSearchMinLength?: number;
  onWebsiteChange: (websiteId: string) => void;
  onVideoToggle: (videoId: string) => void;
  onVideoSelectionModeChange: (mode: VideoSelectionMode) => void;
  onVideoSearchChange: (query: string) => void;
  onVideoFilterKeyChange: (value: string) => void;
  onRetryVideoSearch?: () => void;
  onLoadMoreVideos: () => void;
  onOpenAssignment: () => void;
  onSubmit: (payload: ShareLinkComposerPayload) => Promise<void>;
  createdShareLink: CreateShareLinkResponse | null;
  canonicalResult: CanonicalShareLinkResponse | null;
};

const adminInputClass = [
  "h-10 border shadow-sm transition-colors text-sm font-normal",
  "border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong) placeholder:text-(--admin-text-muted)",
  "hover:border-(--admin-border-strong) hover:bg-(--admin-surface-alt)",
  "focus-visible:ring-2 focus-visible:ring-(--admin-primary)",
].join(" ");

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function preventSearchEnterSubmit(
  event: KeyboardEvent<HTMLInputElement>,
): void {
  if (event.key === "Enter") {
    event.preventDefault();
  }
}

export function ShareLinkComposer({
  websites,
  videos,
  totalVideos,
  activeAssignmentTotal,
  eligibleAssignmentTotal,
  selectedWebsiteId,
  selectedVideoIds,
  videoSelectionMode,
  isSubmitting,
  isVideoRefreshing,
  isLoadingMoreVideos,
  hasMoreVideos,
  videoSearchQuery,
  videoFilterKey,
  videoSearchStatus,
  videoSearchError,
  videoSearchMinLength,
  onWebsiteChange,
  onVideoToggle,
  onVideoSelectionModeChange,
  onVideoSearchChange,
  onVideoFilterKeyChange,
  onRetryVideoSearch,
  onLoadMoreVideos,
  onOpenAssignment,
  onSubmit,
  createdShareLink,
  canonicalResult,
}: ShareLinkComposerProps) {
  const isCanonicalMode = videoSelectionMode === "single";
  const [label, setLabel] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [websiteSearch, setWebsiteSearch] = useState("");
  const filteredWebsites = useMemo(() => {
    const keyword = normalizeSearchText(websiteSearch);

    if (!keyword) {
      return websites;
    }

    return websites.filter((website) =>
      website.name.toLowerCase().includes(keyword),
    );
  }, [websiteSearch, websites]);
  const selectedVideoCount = selectedVideoIds.length;
  const totalWebsiteCount = websites.length;
  const filteredWebsiteCount = filteredWebsites.length;
  const websiteSearchQuery = websiteSearch.trim();
  const trimmedVideoSearchQuery = videoSearchQuery.trim();
  const trimmedVideoFilterKey = videoFilterKey.trim();
  const isSelectedWebsiteHidden =
    websiteSearchQuery.length > 0 &&
    Boolean(selectedWebsiteId) &&
    !filteredWebsites.some((website) => website.id === selectedWebsiteId);
  const canSubmit =
    !isSubmitting && Boolean(selectedWebsiteId) && selectedVideoCount > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await onSubmit({
      ...(label.trim() ? { label: label.trim() } : {}),
      ...(parsePositiveInteger(maxViews) !== undefined
        ? { maxViews: parsePositiveInteger(maxViews) }
        : {}),
      ...(dateTimeLocalToIso(expiresAt)
        ? { expiresAt: dateTimeLocalToIso(expiresAt) }
        : {}),
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm xl:col-span-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--admin-text-muted)">
                Bước 1
              </p>
              <h2 className="text-lg font-semibold text-(--admin-text-strong)">
                Chọn website
              </h2>
              <p className="text-left text-sm text-(--admin-text-muted)">
                {websiteSearchQuery
                  ? `${filteredWebsiteCount}/${totalWebsiteCount} website`
                  : `${totalWebsiteCount} website`}
              </p>
            </div>

            <div className="relative w-full max-w-[50%] lg:max-w-[32%]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--admin-text-muted)" />
              <Input
                aria-label="Tìm website theo tên"
                className={[adminInputClass, "pl-9 pr-9"].join(" ")}
                id="share-link-website-search"
                name="shareLinkWebsiteSearch"
                placeholder="Tìm website..."
                value={websiteSearch}
                onChange={(event) => setWebsiteSearch(event.target.value)}
                onKeyDown={preventSearchEnterSubmit}
              />
              {websiteSearch ? (
                <button
                  aria-label="Xóa tìm kiếm website"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-(--admin-text-muted) transition hover:bg-(--admin-surface-alt) hover:text-(--admin-text-strong)"
                  type="button"
                  onClick={() => setWebsiteSearch("")}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <WebsiteQuickSelect
            selectedWebsiteId={selectedWebsiteId}
            searchQuery={websiteSearchQuery}
            totalWebsites={totalWebsiteCount}
            websites={filteredWebsites}
            onChange={onWebsiteChange}
          />

          {isSelectedWebsiteHidden ? (
            <p className="mt-3 text-sm text-(--admin-text-muted)">
              Website đang chọn đang bị ẩn bởi bộ lọc tìm kiếm.
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col mb-4 gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--admin-text-muted)">
                Bước 2
              </p>
              <h2 className="text-lg font-semibold text-(--admin-text-strong)">
                Chọn video
              </h2>
              <p className="text-left text-sm text-(--admin-text-muted)">
                {videos.length}/{totalVideos} video
              </p>
            </div>

            <div className="relative w-full max-w-[50%] lg:max-w-[32%]">
              {isVideoRefreshing ? (
                <Loader2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-(--admin-text-muted)" />
              ) : (
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--admin-text-muted)" />
              )}
              <Input
                aria-label="Tìm video theo tiêu đề"
                className={[adminInputClass, "pl-9 pr-9"].join(" ")}
                id="share-link-video-search"
                name="shareLinkVideoSearch"
                placeholder="Tìm video..."
                value={videoSearchQuery}
                onChange={(event) => onVideoSearchChange(event.target.value)}
                onKeyDown={preventSearchEnterSubmit}
              />
              {videoSearchQuery ? (
                <button
                  aria-label="Xóa tìm kiếm video"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-(--admin-text-muted) transition hover:bg-(--admin-surface-alt) hover:text-(--admin-text-strong)"
                  type="button"
                  onClick={() => onVideoSearchChange("")}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            <div className="relative w-full max-w-[50%] lg:max-w-[32%]">
              <Input
                aria-label="Lọc video theo key"
                className={[adminInputClass, "pr-9"].join(" ")}
                id="share-link-video-filter-key"
                name="shareLinkVideoFilterKey"
                placeholder="Lọc key..."
                value={videoFilterKey}
                onChange={(event) => onVideoFilterKeyChange(event.target.value)}
                onKeyDown={preventSearchEnterSubmit}
              />
              {videoFilterKey ? (
                <button
                  aria-label="Xóa key lọc video"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-(--admin-text-muted) transition hover:bg-(--admin-surface-alt) hover:text-(--admin-text-strong)"
                  type="button"
                  onClick={() => onVideoFilterKeyChange("")}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            <div
              aria-label="Chế độ chọn video"
              className="flex flex-col gap-1 rounded-lg border border-(--admin-border) bg-(--admin-surface-alt) p-1"
              role="group"
            >
              <button
                aria-pressed={videoSelectionMode === "single"}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  videoSelectionMode === "single"
                    ? "bg-(--admin-primary) text-(--admin-contrast) shadow-sm"
                    : "text-(--admin-text-muted) hover:text-(--admin-text-strong)",
                ].join(" ")}
                type="button"
                onClick={() => onVideoSelectionModeChange("single")}
              >
                1 video
              </button>
              <button
                aria-pressed={videoSelectionMode === "multiple"}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  videoSelectionMode === "multiple"
                    ? "bg-(--admin-primary) text-(--admin-contrast) shadow-sm"
                    : "text-(--admin-text-muted) hover:text-(--admin-text-strong)",
                ].join(" ")}
                type="button"
                onClick={() => onVideoSelectionModeChange("multiple")}
              >
                Nhiều video
              </button>
            </div>
          </div>

          {trimmedVideoFilterKey ? (
            <p className="mb-3 text-xs text-(--admin-text-muted)">
              Key đang lọc: #{trimmedVideoFilterKey}. Video đã chọn vẫn được giữ
              nếu bị ẩn bởi bộ lọc.
            </p>
          ) : null}

          <ReadyVideoPicker
            hasMore={hasMoreVideos}
            isLoadingMore={isLoadingMoreVideos}
            filterKey={trimmedVideoFilterKey}
            searchQuery={trimmedVideoSearchQuery}
            searchStatus={videoSearchStatus}
            searchError={videoSearchError}
            searchMinLength={videoSearchMinLength}
            selectedVideoIds={selectedVideoIds}
            totalVideos={totalVideos}
            activeAssignmentTotal={activeAssignmentTotal}
            eligibleAssignmentTotal={eligibleAssignmentTotal}
            hasSelectedWebsite={Boolean(selectedWebsiteId)}
            videos={videos}
            onLoadMore={onLoadMoreVideos}
            onOpenAssignment={onOpenAssignment}
            onRetrySearch={onRetryVideoSearch}
            onToggle={onVideoToggle}
          />
        </section>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <section className="w-full rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm lg:flex-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--admin-text-muted)">
                Bước 3
              </p>
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-(--admin-primary)" />
                <h2 className="text-lg font-semibold text-(--admin-text-strong)">
                  Thiết lập share link
                </h2>
              </div>
            </div>

            <Button disabled={!canSubmit} type="submit">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Link2 className="size-4" />
              )}
              {isSubmitting
                ? "Đang xử lý..."
                : isCanonicalMode
                  ? "Lấy URL canonical"
                  : "Tạo review bundle"}
            </Button>
          </div>

          {isCanonicalMode ? (
            <p className="mb-4 text-sm text-(--admin-text-muted)">
              Chế độ một video trả về URL canonical ổn định cho cặp
              website–video: gọi lại luôn nhận đúng cùng một URL. URL canonical
              không dùng nhãn, giới hạn lượt xem hay thời hạn.
            </p>
          ) : (
            <p className="mb-4 text-sm text-(--admin-text-muted)">
              Bundle link không phải canonical source URL riêng của từng video.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Nhãn</span>
              <Input
                id="labelInput"
                name="shareLinkLabel"
                className={adminInputClass}
                disabled={isCanonicalMode}
                placeholder="Ví dụ: Gửi cho khách hàng A"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Giới hạn lượt xem</span>
              <Input
                id="maxViewsInput"
                name="shareLinkMaxViews"
                className={adminInputClass}
                disabled={isCanonicalMode}
                min={1}
                placeholder="Không giới hạn"
                type="number"
                value={maxViews}
                onChange={(event) => setMaxViews(event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Thời hạn</span>
              <Input
                id="expiresAtInput"
                name="shareLinkExpiresAt"
                className={adminInputClass}
                disabled={isCanonicalMode}
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </label>
          </div>

          {!canSubmit && !isSubmitting ? (
            <p className="mt-3 text-sm text-(--admin-text-muted)">
              {!selectedWebsiteId
                ? "Chọn một website và ít nhất một video để tạo share link."
                : "Chọn ít nhất một video để tạo share link."}
            </p>
          ) : null}
        </section>

        {canonicalResult ? (
          <CanonicalShareLinkCard
            result={canonicalResult}
            websiteName={
              websites.find((website) => website.id === selectedWebsiteId)
                ?.name ?? null
            }
          />
        ) : createdShareLink ? (
          <CreatedShareLinkCard shareLink={createdShareLink} />
        ) : null}
      </div>
    </form>
  );
}

function parsePositiveInteger(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function dateTimeLocalToIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
