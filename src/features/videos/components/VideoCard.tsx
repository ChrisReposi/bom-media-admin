import { Code2, Database, ImageOff, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import {
  formatDuration,
  formatRelativeTime,
  formatViews,
  getProviderLabel,
} from "../videoFormatters";
import { getDefaultThumbnailUrlFromPlaybackUrl } from "../cloudinaryVideoUtils";
import type { VideoAsset, VideoStatus } from "../videoTypes";

type VideoCardProps = {
  video: VideoAsset;
  onOpen?: (video: VideoAsset) => void;
  onDelete?: (video: VideoAsset) => void;
  isDeleting?: boolean;
};

const statusLabels: Record<VideoStatus, string> = {
  DISABLED: "Đã tắt",
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
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  }

  return "bg-[var(--admin-primary-soft)] text-[var(--admin-primary)]";
}

export function VideoCard({
  video,
  onOpen,
  onDelete,
  isDeleting,
}: VideoCardProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const providerLabel = getProviderLabel(video.provider);
  const isEmbedVideo = video.sourceType === "EMBED" || Boolean(video.embedUrl);
  const isDatabaseVideo = video.sourceType === "DB_BLOB";
  const publishedText = formatRelativeTime(video.publishedAt);
  const viewsText = formatViews(video.viewCount);
  const fallbackThumbnailUrl = useMemo(
    () =>
      video.playbackUrl
        ? getDefaultThumbnailUrlFromPlaybackUrl(video.playbackUrl)
        : null,
    [video.playbackUrl],
  );
  const thumbnailUrl = video.thumbnailUrl ?? fallbackThumbnailUrl;

  useEffect(() => {
    setThumbnailFailed(false);
  }, [thumbnailUrl]);

  function handleDelete(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();

    const confirmed = window.confirm(
      `Xóa video "${video.title}"? Video sẽ được chuyển sang trạng thái DISABLED.`,
    );

    if (confirmed) {
      onDelete?.(video);
    }
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
      <div className="relative aspect-video overflow-hidden bg-(--admin-surface-alt)">
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
        </div>

        <button
          aria-label={`Xóa video ${video.title}`}
          disabled={isDeleting}
          type="button"
          onClick={handleDelete}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </article>
  );
}
