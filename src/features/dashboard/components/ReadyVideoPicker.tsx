import {
  CheckCircle2,
  Code2,
  Database,
  Link2,
  Loader2,
  Server,
  VideoIcon,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  acquireDashboardLocalThumbnail,
  getDashboardThumbnailCacheKey,
  type DashboardThumbnailLease,
} from "@/features/dashboard/dashboardThumbnailCache";
import type { DashboardVideoSearchStatus } from "@/features/dashboard/dashboardTypes";
import { getWebsiteVideoEmptyStateText } from "@/features/dashboard/dashboardAssignmentPolicy";
import {
  filterVideosBySource,
  getVideoSourceLabel,
  isDatabaseVideo,
  isEmbedVideo,
  isLinkVideo,
  isLocalFileVideo,
  isShareableVideo,
  type VideoSourceFilter,
} from "@/features/videos/videoSourceUtils";
import { formatVideoFilterKey } from "@/features/videos/videoFormatters";
import type { VideoAsset } from "@/features/videos/videoTypes";

type ReadyVideoPickerProps = {
  videos: VideoAsset[];
  selectedVideoIds: string[];
  onToggle: (videoId: string) => void;
  totalVideos?: number;
  activeAssignmentTotal: number;
  eligibleAssignmentTotal: number;
  hasSelectedWebsite: boolean;
  searchQuery?: string;
  filterKey?: string;
  searchStatus?: DashboardVideoSearchStatus;
  searchError?: string | null;
  searchMinLength?: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onOpenAssignment: () => void;
  onRetrySearch?: () => void;
};

type FilterTab = {
  value: VideoSourceFilter;
  label: string;
  count: number;
};

export function ReadyVideoPicker({
  videos,
  selectedVideoIds,
  onToggle,
  totalVideos,
  activeAssignmentTotal,
  eligibleAssignmentTotal,
  hasSelectedWebsite,
  searchQuery,
  filterKey,
  searchStatus = "idle",
  searchError,
  searchMinLength = 2,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onOpenAssignment,
  onRetrySearch,
}: ReadyVideoPickerProps) {
  const [sourceFilter, setSourceFilter] = useState<VideoSourceFilter>("all");
  const selectedVideoIdSet = useMemo(
    () => new Set(selectedVideoIds),
    [selectedVideoIds],
  );
  const shareableVideos = useMemo(
    () => videos.filter(isShareableVideo),
    [videos],
  );
  const linkVideos = useMemo(
    () => shareableVideos.filter(isLinkVideo),
    [shareableVideos],
  );
  const embedVideos = useMemo(
    () => shareableVideos.filter(isEmbedVideo),
    [shareableVideos],
  );
  const databaseVideos = useMemo(
    () => shareableVideos.filter(isDatabaseVideo),
    [shareableVideos],
  );
  const localFileVideos = useMemo(
    () => shareableVideos.filter(isLocalFileVideo),
    [shareableVideos],
  );
  const filteredVideos = useMemo(
    () => filterVideosBySource(shareableVideos, sourceFilter),
    [shareableVideos, sourceFilter],
  );
  const filterTabs: FilterTab[] = [
    { value: "all", label: "Tất cả", count: shareableVideos.length },
    { value: "link", label: "Video link", count: linkVideos.length },
    {
      value: "local-file",
      label: "Video server",
      count: localFileVideos.length,
    },
    { value: "embed", label: "Video nhúng", count: embedVideos.length },
    { value: "db-blob", label: "Video DB", count: databaseVideos.length },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          aria-label="Lọc video theo nguồn"
          className="flex flex-wrap gap-2"
          role="group"
        >
          {filterTabs.map((tab) => {
            const isActive = sourceFilter === tab.value;

            return (
              <button
                key={tab.value}
                aria-pressed={isActive}
                className={[
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  isActive
                    ? "border-(--admin-primary) bg-(--admin-primary-soft) text-(--admin-primary)"
                    : "border-(--admin-border) bg-(--admin-surface-alt) text-(--admin-text) hover:border-(--admin-border-strong)",
                ].join(" ")}
                type="button"
                onClick={() => setSourceFilter(tab.value)}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        <p className="text-sm font-medium text-(--admin-text-strong)">
          Đã chọn: {selectedVideoIds.length} video
        </p>
      </div>

      <div
        className="max-h-105 overflow-y-auto pr-2 scrollbar-gutter-stable md:max-h-172.5 xl:max-h-140"
        data-ready-video-scroll-root
      >
        {searchStatus === "too-short" ? (
          <div className="mb-3 rounded-lg border border-(--admin-border) bg-(--admin-surface-alt) p-3 text-sm text-(--admin-text-muted)">
            Nhập ít nhất {searchMinLength} ký tự để tìm video.
          </div>
        ) : null}

        {searchStatus === "error" && searchError ? (
          <div
            className="mb-3 flex flex-col gap-3 rounded-lg border border-(--admin-danger) bg-(--admin-danger-soft) p-3 text-sm text-(--admin-text-strong) sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <span>{searchError}</span>
            {onRetrySearch ? (
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={onRetrySearch}
              >
                Thử lại
              </Button>
            ) : null}
          </div>
        ) : null}

        {filteredVideos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-(--admin-border) p-4 text-sm text-(--admin-text)">
            <p>
              {getWebsiteVideoEmptyStateText({
                searchQuery,
                filterKey,
                shareableCount: shareableVideos.length,
                sourceFilter,
                titleFilteredCount: videos.length,
                totalVideos: totalVideos ?? videos.length,
                activeAssignmentTotal,
                eligibleAssignmentTotal,
                hasSelectedWebsite,
              })}
            </p>
            {hasSelectedWebsite && !searchQuery && !filterKey ? (
              <Button
                className="mt-3"
                size="sm"
                type="button"
                variant="outline"
                onClick={onOpenAssignment}
              >
                Gán video cho website
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredVideos.map((video) => (
              <ReadyVideoCard
                key={video.id}
                isSelected={selectedVideoIdSet.has(video.id)}
                video={video}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>

      {hasMore ? (
        <div className="flex justify-center pt-1">
          <Button
            disabled={isLoadingMore}
            size="sm"
            type="button"
            variant="outline"
            onClick={onLoadMore}
          >
            {isLoadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
            {isLoadingMore ? "Đang tải thêm..." : "Tải thêm video"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

type ReadyVideoCardProps = {
  video: VideoAsset;
  isSelected: boolean;
  onToggle: (videoId: string) => void;
};

const ReadyVideoCard = memo(function ReadyVideoCard({
  video,
  isSelected,
  onToggle,
}: ReadyVideoCardProps) {
  const isDisabled = !isShareableVideo(video);
  // One card per video: the video id keeps each checkbox id unique in the list.
  const checkboxId = `ready-video-${video.id}`;
  const sourceLabel = getVideoSourceLabel(video);
  const filterKeyLabel = formatVideoFilterKey(video.filterKey);
  const thumbnailCacheKey = getDashboardThumbnailCacheKey({
    videoId: video.id,
    thumbnailUrl: video.thumbnailUrl,
    updatedAt: video.updatedAt,
    checksumSha256: video.localThumbnailAsset?.checksumSha256,
  });

  return (
    <label
      htmlFor={checkboxId}
      className={[
        "group overflow-hidden rounded-lg border bg-(--admin-surface-alt) transition",
        isSelected
          ? "border-(--admin-primary)"
          : "border-(--admin-border) hover:border-(--admin-border-strong)",
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <div className="relative aspect-video bg-(--admin-surface)">
        <ReadyVideoThumbnail
          key={thumbnailCacheKey}
          checksumSha256={video.localThumbnailAsset?.checksumSha256}
          hasLocalThumbnail={Boolean(video.localThumbnailAsset)}
          sourceType={video.sourceType}
          thumbnailUrl={video.thumbnailUrl}
          title={video.title}
          updatedAt={video.updatedAt}
          videoId={video.id}
        />

        <input
          checked={isSelected}
          className="sr-only"
          disabled={isDisabled}
          id={checkboxId}
          name="readyVideoIds"
          type="checkbox"
          value={video.id}
          onChange={() => onToggle(video.id)}
        />

        {sourceLabel !== "Unknown" ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/72 px-2 py-1 text-xs font-semibold text-white">
            {sourceLabel === "Embed" ? (
              <Code2 className="size-3" />
            ) : sourceLabel === "Database" ? (
              <Database className="size-3" />
            ) : sourceLabel === "Server" ? (
              <Server className="size-3" />
            ) : (
              <Link2 className="size-3" />
            )}
            {sourceLabel}
          </span>
        ) : null}

        {isSelected ? (
          <span className="absolute right-2 top-2 rounded-full bg-(--admin-primary) p-1 text-white">
            <CheckCircle2 className="size-4" />
          </span>
        ) : null}
      </div>

      <div className="p-3">
        <p className="line-clamp-2 min-h-10 text-sm font-semibold text-(--admin-text-strong)">
          {video.title}
        </p>
        <p className="mt-2 truncate font-mono text-xs text-(--admin-text-muted)">
          {video.id}
        </p>
        {filterKeyLabel ? (
          <span className="mt-2 inline-flex rounded-full bg-(--admin-primary-soft) px-2 py-1 text-xs font-medium text-(--admin-primary)">
            #{filterKeyLabel}
          </span>
        ) : null}
      </div>
    </label>
  );
});

type ReadyVideoThumbnailProps = {
  videoId: string;
  title: string;
  sourceType: VideoAsset["sourceType"];
  thumbnailUrl: string | null;
  updatedAt: string;
  checksumSha256?: string | null;
  hasLocalThumbnail: boolean;
};

const ReadyVideoThumbnail = memo(function ReadyVideoThumbnail({
  videoId,
  title,
  sourceType,
  thumbnailUrl,
  updatedAt,
  checksumSha256,
  hasLocalThumbnail,
}: ReadyVideoThumbnailProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [localThumbnailObjectUrl, setLocalThumbnailObjectUrl] = useState<
    string | null
  >(null);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const isProtectedLocalThumbnail =
    sourceType === "LOCAL_FILE" && hasLocalThumbnail;
  const resolvedThumbnailUrl = isProtectedLocalThumbnail
    ? localThumbnailObjectUrl
    : getSafeThumbnailUrl(thumbnailUrl);
  const cacheKey = getDashboardThumbnailCacheKey({
    videoId,
    thumbnailUrl,
    updatedAt,
    checksumSha256,
  });

  useEffect(() => {
    setThumbnailFailed(false);
  }, [cacheKey, resolvedThumbnailUrl]);

  useEffect(() => {
    if (!isProtectedLocalThumbnail) {
      return;
    }

    const element = containerRef.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true);
      return;
    }

    const scrollRoot = element.closest<HTMLElement>(
      "[data-ready-video-scroll-root]",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      {
        root: scrollRoot,
        rootMargin: "250px",
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [isProtectedLocalThumbnail]);

  useEffect(() => {
    if (!isProtectedLocalThumbnail || !isNearViewport) {
      return;
    }

    let isCancelled = false;
    let lease: DashboardThumbnailLease | null = null;

    setLocalThumbnailObjectUrl(null);

    void acquireDashboardLocalThumbnail({
      videoId,
      thumbnailUrl,
      updatedAt,
      checksumSha256,
    }).then((nextLease) => {
      if (isCancelled) {
        nextLease?.release();
        return;
      }

      lease = nextLease;

      if (nextLease) {
        setLocalThumbnailObjectUrl(nextLease.objectUrl);
        setThumbnailFailed(false);
      } else {
        setThumbnailFailed(true);
      }
    });

    return () => {
      isCancelled = true;
      lease?.release();
    };
  }, [
    cacheKey,
    checksumSha256,
    isNearViewport,
    isProtectedLocalThumbnail,
    thumbnailUrl,
    updatedAt,
    videoId,
  ]);

  return (
    <div ref={containerRef} className="size-full">
      {resolvedThumbnailUrl && !thumbnailFailed ? (
        <img
          alt={title}
          className="size-full object-cover"
          decoding="async"
          loading="lazy"
          src={resolvedThumbnailUrl}
          onError={() => setThumbnailFailed(true)}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-(--admin-text-muted)">
          <VideoIcon className="size-8" />
        </div>
      )}
    </div>
  );
});

function getSafeThumbnailUrl(thumbnailUrl: string | null): string | null {
  const value = thumbnailUrl?.trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}
