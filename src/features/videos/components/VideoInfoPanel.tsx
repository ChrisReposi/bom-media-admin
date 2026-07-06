import { Clipboard, Pencil, Server } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  formatDuration,
  formatVideoFilterKey,
  formatViews,
  getProviderLabel,
} from "../videoFormatters";
import type { VideoAsset, VideoStatus } from "../videoTypes";

type VideoInfoPanelProps = {
  video: VideoAsset;
  onEdit: () => void;
};

const statusLabels: Record<VideoStatus, string> = {
  DISABLED: "Đã tắt",
  DRAFT: "Nháp",
  FAILED: "Lỗi",
  PROCESSING: "Đang xử lý",
  READY: "Sẵn sàng",
};

export function VideoInfoPanel({ video, onEdit }: VideoInfoPanelProps) {
  const isEmbedVideo = video.sourceType === "EMBED" || Boolean(video.embedUrl);
  const isDatabaseVideo = video.sourceType === "DB_BLOB";
  const isLocalFileVideo = video.sourceType === "LOCAL_FILE";
  const playableUrl =
    isDatabaseVideo || isLocalFileVideo
      ? null
      : isEmbedVideo
        ? video.embedUrl
        : video.playbackUrl;
  const filterKeyLabel = formatVideoFilterKey(video.filterKey);

  async function copyPlayableUrl(): Promise<void> {
    if (!playableUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(playableUrl);
      toast.success("Đã sao chép link video.");
    } catch {
      toast.error("Không thể sao chép link video.");
    }
  }

  return (
    <aside className="space-y-5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--admin-text-strong)]">
            Thông tin video
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-text)]">
            Metadata đang lưu trong CMS.
          </p>
        </div>

        <Button type="button" size="sm" onClick={onEdit}>
          <Pencil className="size-4" />
          Sửa
        </Button>
      </div>

      <div className="space-y-4">
        <InfoRow label="Provider" value={getProviderLabel(video.provider)} />
        <InfoRow
          label="Source type"
          value={
            isDatabaseVideo
              ? "Database blob"
              : isLocalFileVideo
                ? "Local server file"
                : isEmbedVideo
                  ? "Embed"
                  : (video.sourceType ?? "Direct URL")
          }
        />
        {video.binaryAsset ? (
          <>
            <InfoRow
              label="Binary MIME"
              value={video.binaryAsset.mimeType}
              breakAll
            />
            <InfoRow
              label="Binary size"
              value={formatBytes(video.binaryAsset.sizeBytes)}
            />
          </>
        ) : null}
        {video.localFileAsset ? (
          <>
            <InfoRow
              label="Local file MIME"
              value={video.localFileAsset.mimeType}
              breakAll
            />
            <InfoRow
              label="Local file size"
              value={formatBytes(video.localFileAsset.sizeBytes)}
            />
            <InfoRow
              label="Original filename"
              value={video.localFileAsset.originalFilename ?? "Chưa có"}
              breakAll
            />
          </>
        ) : null}
        {video.localThumbnailAsset ? (
          <InfoRow
            label="Local thumbnail"
            value={`${video.localThumbnailAsset.mimeType} · ${formatBytes(
              video.localThumbnailAsset.sizeBytes,
            )}`}
            breakAll
          />
        ) : null}
        <InfoRow label="Status" value={statusLabels[video.status]} />
        <InfoRow label="Key lọc" value={filterKeyLabel ?? "Chưa gắn key"} />
        <InfoRow
          label="Duration"
          value={formatDuration(video.durationSeconds)}
        />
        <InfoRow
          label="View count"
          value={`${formatViews(video.viewCount)} lượt xem`}
        />
        <InfoRow
          label="Published at"
          value={formatDateTime(video.publishedAt)}
        />
        <InfoRow label="Created at" value={formatDateTime(video.createdAt)} />
        <InfoRow label="Updated at" value={formatDateTime(video.updatedAt)} />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
              {isDatabaseVideo
                ? "Database playback"
                : isLocalFileVideo
                  ? "Server storage playback"
                  : isEmbedVideo
                    ? "Embed URL"
                    : "Playback URL"}
            </p>
            <Button
              aria-label={
                isEmbedVideo ? "Copy embed link" : "Copy playback link"
              }
              disabled={!playableUrl}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void copyPlayableUrl()}
            >
              <Clipboard className="size-4" />
              Copy
            </Button>
          </div>
          <p className="break-all rounded-md bg-[var(--admin-surface-alt)] px-3 py-2 text-sm text-[var(--admin-text)]">
            {isDatabaseVideo
              ? "Stored in the database. Admin preview uses the protected admin API; share-link viewers use a token-protected public binary endpoint."
              : isLocalFileVideo
                ? "Stored on private server storage. Admin preview uses the protected admin API; share-link viewers use a token-protected public media endpoint."
                : playableUrl || "Chưa có URL phát video"}
          </p>
        </div>

        {isLocalFileVideo ? (
          <div className="flex gap-3 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-2 text-sm text-[var(--admin-text)]">
            <Server className="mt-0.5 size-4 shrink-0 text-[var(--admin-primary)]" />
            <p>
              Storage keys and absolute server paths are intentionally hidden
              from the Admin Web.
            </p>
          </div>
        ) : null}

        <InfoRow
          label="Thumbnail URL"
          value={video.thumbnailUrl || "Chưa có thumbnail"}
          breakAll
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
            Ghi chú
          </p>
          <p className="whitespace-pre-wrap rounded-md bg-[var(--admin-surface-alt)] px-3 py-2 text-sm leading-6 text-[var(--admin-text)]">
            {video.description || "Chưa có ghi chú."}
          </p>
        </div>
      </div>
    </aside>
  );
}

function formatBytes(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "Chưa có";
  }

  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Chưa có";
  }

  const megabytes = bytes / 1024 / 1024;

  if (megabytes >= 1) {
    return `${megabytes.toFixed(megabytes >= 10 ? 1 : 2)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function InfoRow({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
        {label}
      </p>
      <p
        className={
          breakAll
            ? "break-all text-sm text-[var(--admin-text-strong)]"
            : "text-sm text-[var(--admin-text-strong)]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Chưa có";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
