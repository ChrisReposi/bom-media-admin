import {
  Ban,
  Code2,
  Database,
  ImageOff,
  RefreshCw,
  Server,
} from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  acquireDashboardLocalThumbnail,
  getDashboardThumbnailCacheKey,
  type DashboardThumbnailLease,
} from "@/features/dashboard/dashboardThumbnailCache";
import { cn } from "@/lib/utils";

import {
  formatDuration,
  formatRelativeTime,
  formatVideoFilterKey,
  formatViews,
  getProviderLabel,
} from "../videoFormatters";
import { getDefaultThumbnailUrlFromPlaybackUrl } from "../cloudinaryVideoUtils";
import type { VideoAsset, VideoStatus } from "../videoTypes";

type VideoCardProps = {
  video: VideoAsset;
  onOpen?: (video: VideoAsset) => void;
  onRequestStatusToggle?: (video: VideoAsset) => void;
  isStatusUpdating?: boolean;
};

const statusLabels: Record<VideoStatus, string> = {
  DISABLED: "Đã vô hiệu hóa",
  DRAFT: "Nháp",
  FAILED: "Lỗi",
  PROCESSING: "Đang xử lý",
  READY: "Sẵn sàng",
};

function getInitials(video: VideoAsset): string {
  const source = video.title.trim() || video.provider;
  return source.slice(0, 2).toUpperCase();
}

function shouldShowStatus(status: VideoStatus): boolean {
  return status !== "READY" && status !== "DRAFT";
}

function getStatusClass(status: VideoStatus): string {
  if (status === "FAILED" || status === "DISABLED") {
    return "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]";
  }

  if (status === "PROCESSING") {
    return "bg-[var(--admin-warning-soft)] text-[var(--admin-warning)]";
  }

  return "bg-[var(--admin-primary-soft)] text-[var(--admin-primary)]";
}

export function VideoCard({
  video,
  onOpen,
  onRequestStatusToggle,
  isStatusUpdating,
}: VideoCardProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [localThumbnailObjectUrl, setLocalThumbnailObjectUrl] = useState<
    string | null
  >(null);
  const [isThumbnailNearViewport, setIsThumbnailNearViewport] = useState(false);
  const thumbnailContainerRef = useRef<HTMLDivElement | null>(null);
  const providerLabel = getProviderLabel(video.provider);
  const isEmbedVideo = video.sourceType === "EMBED" || Boolean(video.embedUrl);
  const isDatabaseVideo = video.sourceType === "DB_BLOB";
  const isLocalFileVideo = video.sourceType === "LOCAL_FILE";
  const hasLocalThumbnail = Boolean(video.localThumbnailAsset);
  const localThumbnailChecksum =
    video.localThumbnailAsset?.checksumSha256 ?? null;
  const canDisable = video.status === "READY";
  const canRestore = video.status === "DISABLED";
  const canToggleStatus = canDisable || canRestore;
  const statusActionLabel = canRestore
    ? "Kích hoạt lại video"
    : "Vô hiệu hoá video";
  const publishedText = formatRelativeTime(video.publishedAt);
  const viewsText = formatViews(video.viewCount);
  const filterKeyLabel = formatVideoFilterKey(video.filterKey);
  const fallbackThumbnailUrl = useMemo(
    () =>
      video.playbackUrl
        ? getDefaultThumbnailUrlFromPlaybackUrl(video.playbackUrl)
        : null,
    [video.playbackUrl],
  );
  const thumbnailUrl =
    isLocalFileVideo && video.localThumbnailAsset
      ? localThumbnailObjectUrl
      : (video.thumbnailUrl ?? fallbackThumbnailUrl);
  const thumbnailCacheKey = getDashboardThumbnailCacheKey({
    videoId: video.id,
    thumbnailUrl: video.thumbnailUrl,
    updatedAt: video.updatedAt,
    checksumSha256: localThumbnailChecksum,
  });

  useEffect(() => {
    setThumbnailFailed(false);
  }, [thumbnailUrl]);

  useEffect(() => {
    if (!isLocalFileVideo || !hasLocalThumbnail) {
      return;
    }

    const element = thumbnailContainerRef.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      setIsThumbnailNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsThumbnailNearViewport(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "250px",
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [hasLocalThumbnail, isLocalFileVideo, thumbnailCacheKey]);

  useEffect(() => {
    if (!isLocalFileVideo || !hasLocalThumbnail || !isThumbnailNearViewport) {
      return;
    }

    let isCancelled = false;
    let lease: DashboardThumbnailLease | null = null;

    setLocalThumbnailObjectUrl(null);

    void acquireDashboardLocalThumbnail({
      videoId: video.id,
      thumbnailUrl: video.thumbnailUrl,
      updatedAt: video.updatedAt,
      checksumSha256: localThumbnailChecksum,
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
    hasLocalThumbnail,
    isLocalFileVideo,
    isThumbnailNearViewport,
    localThumbnailChecksum,
    thumbnailCacheKey,
    video.id,
    video.thumbnailUrl,
    video.updatedAt,
  ]);

  function handleStatusToggle(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    onRequestStatusToggle?.(video);
  }

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-lg border border-(--admin-border) bg-(--admin-surface) shadow-sm transition hover:border-(--admin-border-strong) hover:shadow-(--admin-shadow)",
        onOpen && "cursor-pointer focus-within:border-(--admin-border-strong)",
      )}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => onOpen?.(video)}
      onKeyDown={(event) => {
        if (!onOpen || event.target !== event.currentTarget) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(video);
        }
      }}
    >
      <div
        ref={thumbnailContainerRef}
        className="relative aspect-video overflow-hidden bg-(--admin-surface-alt)"
      >
        {thumbnailUrl && !thumbnailFailed ? (
          <img
            alt={video.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            decoding="async"
            loading="lazy"
            src={thumbnailUrl}
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#e7eef9_0%,#cbdcf1_48%,#9fbde2_100%)] text-(--admin-text) dark:bg-[linear-gradient(135deg,#242936_0%,#1b2230_52%,#111827_100%)]">
            <ImageOff className="size-9 opacity-70" />
          </div>
        )}

        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/82 px-1.5 py-0.5 text-xs font-semibold text-white">
          {formatDuration(video.durationSeconds)}
        </span>

        {shouldShowStatus(video.status) ? (
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-semibold",
              getStatusClass(video.status),
            )}
          >
            {statusLabels[video.status]}
          </span>
        ) : null}

        {isDatabaseVideo ? (
          <span className="absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/72 px-2 py-1 text-xs font-semibold text-white">
            <Database className="size-3" />
            DB
          </span>
        ) : isLocalFileVideo ? (
          <span className="absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/72 px-2 py-1 text-xs font-semibold text-white">
            <Server className="size-3" />
            Server
          </span>
        ) : isEmbedVideo ? (
          <span className="absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/72 px-2 py-1 text-xs font-semibold text-white">
            <Code2 className="size-3" />
            Embed
          </span>
        ) : null}
      </div>

      <div className="flex gap-3 p-4 pr-2 items-start">
        <div className="min-w-0 flex-1">
          <h3 className="video-title text-base font-semibold leading-5 text-(--admin-text-strong)">
            {video.title}
          </h3>

          <p className="mt-1.5 text-sm text-(--admin-text-muted)">
            {viewsText} lượt xem · {publishedText}
          </p>
          {filterKeyLabel ? (
            <span className="mt-2 inline-flex rounded-full bg-(--admin-primary-soft) px-2 py-1 text-xs font-medium text-(--admin-primary)">
              #{filterKeyLabel}
            </span>
          ) : null}
        </div>

        {canToggleStatus ? (
          <button
            aria-label={`${statusActionLabel} ${video.title}`}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-(--admin-border) text-(--admin-text) transition-colors",
              "hover:border-(--admin-border-strong) hover:bg-(--admin-hover-row) hover:text-(--admin-text-strong)",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-focus-ring)",
              "disabled:cursor-not-allowed disabled:opacity-50",
              canRestore
                ? "hover:text-(--admin-primary)"
                : "hover:border-(--admin-danger) hover:text-(--admin-danger)",
            )}
            disabled={isStatusUpdating}
            title={statusActionLabel}
            type="button"
            onClick={handleStatusToggle}
          >
            {canRestore ? (
              <RefreshCw className="size-4" />
            ) : (
              <Ban className="size-4" />
            )}
          </button>
        ) : null}
      </div>
    </article>
  );
}
