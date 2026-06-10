import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { EditVideoModal } from "@/features/videos/components/EditVideoModal";
import { VideoDetailErrorState } from "@/features/videos/components/VideoDetailErrorState";
import { VideoDetailSkeleton } from "@/features/videos/components/VideoDetailSkeleton";
import { VideoInfoPanel } from "@/features/videos/components/VideoInfoPanel";
import { VideoPlayerPanel } from "@/features/videos/components/VideoPlayerPanel";
import { getApiErrorMessage, getVideoById } from "@/features/videos/videoApi";
import {
  formatRelativeTime,
  formatViews,
} from "@/features/videos/videoFormatters";
import type { VideoAsset, VideoStatus } from "@/features/videos/videoTypes";
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

  function goBack(): void {
    navigate("/videos");
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

function getStatusClass(status: VideoStatus): string {
  if (status === "FAILED" || status === "DISABLED") {
    return "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]";
  }

  if (status === "PROCESSING") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  }

  return "bg-[var(--admin-primary-soft)] text-[var(--admin-primary)]";
}
