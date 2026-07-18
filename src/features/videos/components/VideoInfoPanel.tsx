import { Clipboard, Pencil, Server } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  formatDuration,
  formatVideoFilterKey,
  formatViews,
  getProviderLabel,
} from "../videoFormatters";
import type { VideoAsset, VideoStatus } from "../videoTypes";

type VideoInfoPanelProps = {
  video: VideoAsset;
  onEdit?: () => void;
};

const statusLabels: Record<VideoStatus, string> = {
  DISABLED: "Đã vô hiệu hóa",
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
  const sourceTypeLabel = isDatabaseVideo
    ? "Cơ sở dữ liệu (DB_BLOB)"
    : isLocalFileVideo
      ? "File trên server (LOCAL_FILE)"
      : isEmbedVideo
        ? "Nhúng (embed)"
        : (video.sourceType ?? "URL trực tiếp");
  const mimeType =
    video.localFileAsset?.mimeType ?? video.binaryAsset?.mimeType ?? null;
  const fileSize =
    video.localFileAsset?.sizeBytes ?? video.binaryAsset?.sizeBytes ?? null;
  const videoChecksum = video.localFileAsset?.checksumSha256?.trim() || null;
  const thumbnailChecksum =
    video.localThumbnailAsset?.checksumSha256?.trim() || null;
  const hasIntegrity = Boolean(videoChecksum || thumbnailChecksum);

  async function copyText(value: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${label}.`);
    } catch {
      toast.error(`Không thể sao chép ${label}.`);
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

        {onEdit ? (
          <Button type="button" size="sm" onClick={onEdit}>
            <Pencil className="size-4" />
            Sửa
          </Button>
        ) : null}
      </div>

      <Section title="Tổng quan">
        <dl className="space-y-3">
          <MetaRow
            copyLabel="ID video"
            label="ID"
            mono
            value={video.id}
            onCopy={() => copyText(video.id, "ID video")}
          />
          <MetaRow label="Trạng thái" value={statusLabels[video.status]} />
          <MetaRow
            label="Key phân loại"
            muted={!filterKeyLabel}
            value={filterKeyLabel ?? "Chưa gắn key"}
          />
          <MetaRow label="Provider" value={getProviderLabel(video.provider)} />
          <MetaRow label="Loại nguồn" value={sourceTypeLabel} />
          {mimeType ? (
            <MetaRow label="Định dạng" mono value={mimeType} />
          ) : null}
          {fileSize ? (
            <MetaRow label="Dung lượng" value={formatBytes(fileSize)} />
          ) : null}
          <MetaRow
            label="Thời lượng"
            value={formatDuration(video.durationSeconds)}
          />
          <MetaRow
            label="Lượt xem"
            value={`${formatViews(video.viewCount)} lượt xem`}
          />
        </dl>
      </Section>

      <Section title="Thời gian">
        <dl className="space-y-3">
          <MetaRow
            label="Ngày phát hành"
            value={formatDateTime(video.publishedAt)}
          />
          <MetaRow label="Ngày tạo" value={formatDateTime(video.createdAt)} />
          <MetaRow label="Cập nhật" value={formatDateTime(video.updatedAt)} />
        </dl>
      </Section>

      <Section title="Nguồn phát">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
              {isDatabaseVideo
                ? "Nguồn phát (cơ sở dữ liệu)"
                : isLocalFileVideo
                  ? "Nguồn phát (server storage)"
                  : isEmbedVideo
                    ? "Embed URL"
                    : "Playback URL"}
            </p>
            <Button
              aria-label={
                isEmbedVideo ? "Sao chép embed URL" : "Sao chép playback URL"
              }
              disabled={!playableUrl}
              size="sm"
              type="button"
              variant="outline"
              onClick={() =>
                void copyText(
                  playableUrl ?? "",
                  isEmbedVideo ? "embed URL" : "playback URL",
                )
              }
            >
              <Clipboard className="size-4" />
              Sao chép
            </Button>
          </div>
          <p className="break-all rounded-md bg-[var(--admin-surface-alt)] px-3 py-2 text-sm text-[var(--admin-text)]">
            {isDatabaseVideo
              ? "Video lưu trong cơ sở dữ liệu. Bản xem trước cho quản trị viên dùng API admin bảo mật; người xem qua share link dùng endpoint binary công khai được bảo vệ bằng token."
              : isLocalFileVideo
                ? "Video lưu trên server storage riêng. Bản xem trước cho quản trị viên dùng API admin bảo mật; người xem qua share link dùng endpoint media công khai được bảo vệ bằng token."
                : playableUrl || "Chưa có URL phát video"}
          </p>
        </div>

        <dl className="space-y-3">
          {video.localFileAsset?.originalFilename ? (
            <MetaRow
              label="Tên file gốc"
              mono
              value={video.localFileAsset.originalFilename}
            />
          ) : null}
          {video.providerAssetId ? (
            <MetaRow
              copyLabel="provider asset ID"
              label="Provider asset ID"
              mono
              value={video.providerAssetId}
              onCopy={() =>
                copyText(video.providerAssetId ?? "", "provider asset ID")
              }
            />
          ) : null}
          <MetaRow
            label="Thumbnail URL"
            muted={!video.thumbnailUrl}
            value={video.thumbnailUrl || "Chưa có thumbnail"}
          />
        </dl>

        {isLocalFileVideo ? (
          <div className="flex gap-3 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-2 text-sm text-[var(--admin-text)]">
            <Server className="mt-0.5 size-4 shrink-0 text-[var(--admin-primary)]" />
            <p>
              Storage key và đường dẫn tuyệt đối trên server được cố tình ẩn
              khỏi Admin Web.
            </p>
          </div>
        ) : null}
      </Section>

      {hasIntegrity ? (
        <Section title="Tính toàn vẹn (SHA-256)">
          <div className="space-y-3">
            {videoChecksum ? (
              <ChecksumRow
                label="SHA-256 của file video"
                value={videoChecksum}
                onCopy={() => copyText(videoChecksum, "SHA-256 của file video")}
              />
            ) : null}
            {thumbnailChecksum ? (
              <ChecksumRow
                label="SHA-256 của thumbnail"
                value={thumbnailChecksum}
                onCopy={() =>
                  copyText(thumbnailChecksum, "SHA-256 của thumbnail")
                }
              />
            ) : null}
            <p className="text-xs leading-5 text-[var(--admin-text-muted)]">
              Mã này hỗ trợ kiểm tra file có thay đổi hay không. Nó không tự
              chứng minh quyền sở hữu bản quyền.
            </p>
          </div>
        </Section>
      ) : null}

      <Section title="Ghi chú">
        <p className="whitespace-pre-wrap rounded-md bg-[var(--admin-surface-alt)] px-3 py-2 text-sm leading-6 text-[var(--admin-text)]">
          {video.description || "Chưa có ghi chú."}
        </p>
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-t border-[var(--admin-border)] pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-[var(--admin-text-strong)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
  muted = false,
  copyLabel,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
  copyLabel?: string;
  onCopy?: () => void | Promise<void>;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
        {label}
      </dt>
      <dd className="flex items-start gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 break-all text-sm",
            muted
              ? "text-[var(--admin-text-muted)]"
              : "text-[var(--admin-text-strong)]",
            mono && "font-mono text-xs",
          )}
        >
          {value}
        </span>
        {onCopy ? (
          <CopyIconButton label={copyLabel ?? label} onCopy={onCopy} />
        ) : null}
      </dd>
    </div>
  );
}

function ChecksumRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void | Promise<void>;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
          {label}
        </p>
        <CopyIconButton label={label} onCopy={onCopy} />
      </div>
      <p className="break-all rounded-md bg-[var(--admin-surface-alt)] px-3 py-2 font-mono text-xs text-[var(--admin-text-strong)]">
        {value}
      </p>
    </div>
  );
}

function CopyIconButton({
  label,
  onCopy,
}: {
  label: string;
  onCopy: () => void | Promise<void>;
}) {
  return (
    <button
      aria-label={`Sao chép ${label}`}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-[var(--admin-border)] text-[var(--admin-text-muted)] transition-colors hover:border-[var(--admin-border-strong)] hover:text-[var(--admin-text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-focus-ring)]"
      title={`Sao chép ${label}`}
      type="button"
      onClick={() => void onCopy()}
    >
      <Clipboard className="size-3.5" />
    </button>
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
