import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  HardDrive,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditVideoModal } from "@/features/videos/components/EditVideoModal";
import { VideoDetailErrorState } from "@/features/videos/components/VideoDetailErrorState";
import { VideoDetailSkeleton } from "@/features/videos/components/VideoDetailSkeleton";
import { VideoInfoPanel } from "@/features/videos/components/VideoInfoPanel";
import { VideoPlayerPanel } from "@/features/videos/components/VideoPlayerPanel";
import {
  getApiErrorMessage,
  getVideoById,
  purgeVideo,
} from "@/features/videos/videoApi";
import {
  formatRelativeTime,
  formatViews,
} from "@/features/videos/videoFormatters";
import type {
  PurgeVideoResponse,
  VideoAsset,
  VideoStatus,
} from "@/features/videos/videoTypes";
import { cn } from "@/lib/utils";

const statusLabels: Record<VideoStatus, string> = {
  DISABLED: "Đã tắt",
  DRAFT: "Nháp",
  FAILED: "Lỗi",
  PROCESSING: "Đang xử lý",
  READY: "Sẵn sàng",
};

export function VideoDetailPage() {
  const navigate = useNavigate();
  const { videoId } = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<VideoAsset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = useState(false);
  const [purgeConfirmation, setPurgeConfirmation] = useState("");
  const [purgeUnderstood, setPurgeUnderstood] = useState(false);
  const [purgeDeleteRemoteAsset, setPurgeDeleteRemoteAsset] = useState(false);

  const fetchVideo = useCallback(async () => {
    if (!videoId) {
      setError("Không tìm thấy video.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      setError(null);
      const response = await getVideoById(videoId);
      setVideo(response);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void fetchVideo();
  }, [fetchVideo]);

  useEffect(() => {
    setIsPurgeConfirmOpen(false);
    setPurgeConfirmation("");
    setPurgeUnderstood(false);
    setPurgeDeleteRemoteAsset(false);
  }, [video?.id]);

  function goBack(): void {
    navigate("/videos");
  }

  async function handlePurgeVideo(): Promise<void> {
    if (!video) {
      return;
    }

    if (purgeConfirmation.trim() !== video.id || !purgeUnderstood) {
      toast.error("Vui lòng nhập đúng video ID và xác nhận rủi ro purge.");
      return;
    }

    setIsPurging(true);

    try {
      const result = await purgeVideo(video.id, {
        confirmVideoId: purgeConfirmation.trim(),
        ...(purgeDeleteRemoteAsset ? { deleteRemoteAsset: true } : {}),
      });

      toast.success(formatPurgeSuccessMessage(result), {
        duration: result.storage?.orphanCleanupRequired ? 9000 : 6000,
      });
      navigate("/videos");
    } catch (purgeError) {
      toast.error(getApiErrorMessage(purgeError));
    } finally {
      setIsPurging(false);
    }
  }

  if (isLoading) {
    return <VideoDetailSkeleton />;
  }

  if (error || !video) {
    return (
      <VideoDetailErrorState
        message={error ?? "Không tìm thấy video."}
        onBack={goBack}
        onRetry={() => void fetchVideo()}
      />
    );
  }

  const viewsText = `${formatViews(video.viewCount)} lượt xem`;
  const publishedText = formatRelativeTime(video.publishedAt);
  const canPurge =
    purgeConfirmation.trim() === video.id && purgeUnderstood && !isPurging;

  return (
    <section className="space-y-6">
      <div className="flex flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 mb-5">
          <Button type="button" variant="outline" onClick={goBack}>
            <ArrowLeft className="size-4" />
            Videos
          </Button>
          <h1 className="truncate text-2xl font-semibold text-(--admin-text-strong)">
            Video Detail
          </h1>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <VideoPlayerPanel video={video} />

          <div className="space-y-2">
            <div className="flex flex-wrap items-start gap-3">
              <h2 className="min-w-0 flex-1 text-2xl font-semibold leading-tight text-(--admin-text-strong)">
                {video.title}
              </h2>
              {video.status !== "READY" ? (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    getStatusClass(video.status),
                  )}
                >
                  {statusLabels[video.status]}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-(--admin-text)">
              {viewsText} · {publishedText}
            </p>
          </div>
        </div>

        <VideoInfoPanel video={video} onEdit={() => setEditOpen(true)} />
      </div>

      <section className="rounded-lg border border-[var(--admin-danger)] bg-[var(--admin-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]">
              <AlertTriangle className="size-5" />
            </span>
            <div className="space-y-2">
              <div>
                <h2 className="text-lg font-semibold text-[var(--admin-text-strong)]">
                  Danger Zone
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--admin-text)]">
                  Vô hiệu hoá video chỉ đổi trạng thái và giữ metadata/file.
                  Purge vĩnh viễn sẽ xoá metadata video và cố gắng xoá file
                  video/thumbnail thuộc video này khỏi server storage. Không thể
                  hoàn tác nếu không restore backup.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-[var(--admin-text-muted)]">
                <span className="rounded-full border border-[var(--admin-border)] px-2.5 py-1">
                  Disable = giữ file
                </span>
                <span className="rounded-full border border-[var(--admin-border)] px-2.5 py-1">
                  Purge = xoá metadata và reclaim storage
                </span>
              </div>
            </div>
          </div>

          {!isPurgeConfirmOpen ? (
            <Button
              className="w-full lg:w-auto"
              type="button"
              variant="destructive"
              onClick={() => setIsPurgeConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
              Xoá vĩnh viễn
            </Button>
          ) : null}
        </div>

        {isPurgeConfirmOpen ? (
          <div className="mt-5 space-y-4 rounded-lg border border-[var(--admin-danger)] bg-[var(--admin-danger-soft)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--admin-text-strong)]">
                  Xác nhận purge vĩnh viễn
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--admin-text)]">
                  Nhập chính xác video ID để tiếp tục. Backend vẫn sẽ chặn purge
                  nếu video còn được gán website hoặc share link.
                </p>
              </div>
              <Button
                aria-label="Huỷ purge"
                disabled={isPurging}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsPurgeConfirmOpen(false);
                  setPurgeConfirmation("");
                  setPurgeUnderstood(false);
                  setPurgeDeleteRemoteAsset(false);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--admin-text-strong)]">
                  Video ID
                </span>
                <Input
                  autoComplete="off"
                  disabled={isPurging}
                  placeholder={video.id}
                  value={purgeConfirmation}
                  onChange={(event) => setPurgeConfirmation(event.target.value)}
                />
              </label>

              <div className="rounded-md bg-[var(--admin-surface)] px-3 py-2 text-xs text-[var(--admin-text-muted)]">
                <span className="font-semibold text-[var(--admin-text)]">
                  Phải khớp:
                </span>{" "}
                <span className="break-all">{video.id}</span>
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm leading-6 text-[var(--admin-text)]">
              <input
                checked={purgeUnderstood}
                className="mt-1 size-4 rounded border-[var(--admin-border)]"
                disabled={isPurging}
                type="checkbox"
                onChange={(event) => setPurgeUnderstood(event.target.checked)}
              />
              <span>
                Tôi hiểu purge sẽ xoá metadata video và cố gắng xoá file
                LOCAL_FILE video/thumbnail thuộc video này khỏi server storage.
              </span>
            </label>

            {video.provider === "CLOUDINARY" && video.providerAssetId ? (
              <label className="flex items-start gap-3 text-sm leading-6 text-[var(--admin-text)]">
                <input
                  checked={purgeDeleteRemoteAsset}
                  className="mt-1 size-4 rounded border-[var(--admin-border)]"
                  disabled={isPurging}
                  type="checkbox"
                  onChange={(event) =>
                    setPurgeDeleteRemoteAsset(event.target.checked)
                  }
                />
                <span>
                  Đồng thời yêu cầu backend xoá remote Cloudinary asset nếu
                  backend hỗ trợ và asset thuộc video này.
                </span>
              </label>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-sm text-[var(--admin-text)]">
                <HardDrive className="mt-0.5 size-4 shrink-0 text-[var(--admin-primary)]" />
                <span>
                  Kết quả purge chỉ hiển thị trạng thái xoá và dung lượng
                  reclaimed; Admin Web không hiển thị storage path.
                </span>
              </div>

              <Button
                disabled={!canPurge}
                type="button"
                variant="destructive"
                onClick={() => void handlePurgeVideo()}
              >
                {isPurging ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Purge permanently
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <EditVideoModal
        open={editOpen}
        video={video}
        onOpenChange={setEditOpen}
        onUpdated={(updatedVideo) => {
          setVideo(updatedVideo);
          void fetchVideo();
        }}
      />
    </section>
  );
}

function formatPurgeSuccessMessage(response: PurgeVideoResponse): string {
  const storage = response.storage;
  const bytesText = formatBytesReclaimed(storage?.bytesReclaimed);
  const reclaimedText = bytesText ? ` Đã giải phóng ${bytesText}.` : "";

  if (!storage) {
    return `${response.message || "Đã xoá vĩnh viễn video."}${reclaimedText}`;
  }

  const attempted =
    storage.localVideoDeleteAttempted || storage.localThumbnailDeleteAttempted;
  const failedLocalDelete =
    Boolean(storage.orphanCleanupRequired) ||
    Boolean(storage.localVideoDeleteAttempted && !storage.localVideoDeleted) ||
    Boolean(
      storage.localThumbnailDeleteAttempted && !storage.localThumbnailDeleted,
    );

  if (!attempted) {
    return `Đã xoá vĩnh viễn video. Không có LOCAL_FILE storage gắn kèm.${reclaimedText}`;
  }

  if (failedLocalDelete) {
    return `Đã xoá metadata video, nhưng có file local chưa xoá được. Chạy orphan cleanup dry-run.${reclaimedText}`;
  }

  const deletedParts = [
    storage.localVideoDeleted ? "video file" : null,
    storage.localThumbnailDeleted ? "thumbnail" : null,
  ].filter(Boolean);

  if (deletedParts.length > 0) {
    return `Đã xoá vĩnh viễn video. Đã xoá local ${deletedParts.join(" và ")}.${reclaimedText}`;
  }

  return `Đã xoá vĩnh viễn video.${reclaimedText}`;
}

function formatBytesReclaimed(value?: string | number | null): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex === 0 || size >= 10 ? 0 : 1;

  return `${size.toFixed(precision)} ${units[unitIndex]}`;
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
