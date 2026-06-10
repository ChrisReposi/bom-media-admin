import { RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CreatedShareLinkCard } from "@/features/dashboard/components/CreatedShareLinkCard";
import { ShareLinkComposer } from "@/features/dashboard/components/ShareLinkComposer";
import type { ShareLinkComposerPayload } from "@/features/dashboard/dashboardTypes";
import { getVideos } from "@/features/videos/videoApi";
import { isShareableVideo } from "@/features/videos/videoSourceUtils";
import type { VideoAsset } from "@/features/videos/videoTypes";
import {
  createShareLink,
  getWebsiteApiErrorMessage,
  getWebsites,
} from "@/features/websites/websiteApi";
import type {
  CreateShareLinkResponse,
  Website,
} from "@/features/websites/websiteTypes";

export function DashboardPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [createdShareLink, setCreatedShareLink] =
    useState<CreateShareLinkResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readyVideos = useMemo(
    () =>
      videos.filter(
        (video) => video.status === "READY" && isShareableVideo(video),
      ),
    [videos],
  );
  const activeWebsites = useMemo(
    () => websites.filter((website) => website.status === "ACTIVE"),
    [websites],
  );
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);

    try {
      setError(null);
      const [websitesResponse, videosResponse] = await Promise.all([
        getWebsites({ page: 1, limit: 100 }),
        getVideos({ page: 1, limit: 100, status: "READY" }),
      ]);
      const nextWebsites = websitesResponse.items.filter(
        (website) => website.status === "ACTIVE",
      );

      setWebsites(websitesResponse.items);
      setVideos(videosResponse.items);
      setSelectedWebsiteId((currentWebsiteId) => {
        if (
          currentWebsiteId &&
          nextWebsites.some((website) => website.id === currentWebsiteId)
        ) {
          return currentWebsiteId;
        }

        return nextWebsites[0]?.id ?? "";
      });
      setSelectedVideoIds((currentVideoIds) => {
        const playableVideoIds = new Set(
          videosResponse.items
            .filter(
              (video) => video.status === "READY" && isShareableVideo(video),
            )
            .map((video) => video.id),
        );

        return currentVideoIds.filter((videoId) =>
          playableVideoIds.has(videoId),
        );
      });
    } catch (fetchError) {
      setError(getWebsiteApiErrorMessage(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  function handleVideoToggle(videoId: string): void {
    setSelectedVideoIds((currentVideoIds) =>
      currentVideoIds.includes(videoId)
        ? currentVideoIds.filter((currentVideoId) => currentVideoId !== videoId)
        : [...currentVideoIds, videoId],
    );
  }

  async function handleCreateShareLink(
    payload: ShareLinkComposerPayload,
  ): Promise<void> {
    if (!selectedWebsiteId) {
      toast.error("Vui lòng chọn website.");
      return;
    }

    if (selectedVideoIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một video READY.");
      return;
    }

    setIsSubmitting(true);
    setCreatedShareLink(null);

    try {
      const response = await createShareLink(selectedWebsiteId, {
        ...payload,
        videoIds: selectedVideoIds,
      });

      setCreatedShareLink(response);
      toast.success("Đã tạo share link.");

      if (response.publicUrl) {
        await copyPublicUrl(response.publicUrl);
      } else {
        toast.warning(
          "Website chưa có domain active nên chưa thể tạo URL public.",
        );
      }
    } catch (createError) {
      toast.error(getWebsiteApiErrorMessage(createError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-(--admin-text-strong)">
          Dashboard
        </h1>
        <Button
          type="button"
          variant="outline"
          onClick={() => void fetchDashboardData()}
        >
          <RefreshCcw className="size-4" />
          Tải lại
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-(--admin-danger-soft) bg-(--admin-danger-soft) p-4 text-sm text-(--admin-danger)">
          <div>{error}</div>
          <Button
            className="mt-3"
            type="button"
            variant="outline"
            onClick={() => void fetchDashboardData()}
          >
            Thử lại
          </Button>
        </div>
      ) : null}

      <ShareLinkComposer
        isSubmitting={isSubmitting}
        selectedVideoIds={selectedVideoIds}
        selectedWebsiteId={selectedWebsiteId}
        videos={readyVideos}
        websites={activeWebsites}
        onSubmit={handleCreateShareLink}
        onVideoToggle={handleVideoToggle}
        onWebsiteChange={setSelectedWebsiteId}
      />

      {createdShareLink ? (
        <CreatedShareLinkCard shareLink={createdShareLink} />
      ) : null}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <section className="space-y-6">
      <div className="h-32 animate-pulse rounded-lg bg-(--admin-surface)" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-24 animate-pulse rounded-lg bg-(--admin-surface)" />
        <div className="h-24 animate-pulse rounded-lg bg-(--admin-surface)" />
        <div className="h-24 animate-pulse rounded-lg bg-(--admin-surface)" />
      </div>
      <div className="h-80 animate-pulse rounded-lg bg-(--admin-surface)" />
    </section>
  );
}

async function copyPublicUrl(publicUrl: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Đã sao chép public URL.");
  } catch {
    toast.error("Không thể sao chép URL. Vui lòng copy thủ công.");
  }
}
