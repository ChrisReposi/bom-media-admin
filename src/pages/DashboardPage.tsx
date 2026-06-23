import { RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  loadDashboardActiveWebsites,
  loadDashboardVideoPage,
  type DashboardVideoCacheParams,
} from "@/features/dashboard/dashboardCache";
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
import { useAppSelector } from "@/store/hooks";

const DASHBOARD_VIDEO_PAGE_SIZE = 24;
const DASHBOARD_VIDEO_SEARCH_DEBOUNCE_MS = 300;
const DASHBOARD_VIDEO_STATUS = "READY" as const;
const DASHBOARD_VIDEO_SORT_BY = "createdAt" as const;
const DASHBOARD_VIDEO_SORT_ORDER = "desc" as const;

export function DashboardPage() {
  const adminId = useAppSelector((state) => state.auth.admin?.id);
  const cacheScope = adminId ?? "unknown-admin";
  const [websites, setWebsites] = useState<Website[]>([]);
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [videoMeta, setVideoMeta] = useState({
    total: 0,
    totalPages: 0,
  });
  const [videoPage, setVideoPage] = useState(1);
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [debouncedVideoSearch, setDebouncedVideoSearch] = useState("");
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [createdShareLink, setCreatedShareLink] =
    useState<CreateShareLinkResponse | null>(null);
  const [hasLoadedWebsites, setHasLoadedWebsites] = useState(false);
  const [hasLoadedVideos, setHasLoadedVideos] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVideoRefreshing, setIsVideoRefreshing] = useState(false);
  const [isLoadingMoreVideos, setIsLoadingMoreVideos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoDatasetVersionRef = useRef(0);
  const hasLoadedVideosRef = useRef(false);

  const loadWebsites = useCallback(
    async (bypassCache = false): Promise<boolean> => {
      try {
        setWebsiteError(null);

        const nextWebsites = await loadDashboardActiveWebsites({
          scope: cacheScope,
          bypassCache,
          fetcher: async () => {
            const response = await getWebsites({ page: 1, limit: 100 });
            return response.items.filter(
              (website) => website.status === "ACTIVE",
            );
          },
        });

        setWebsites(nextWebsites);
        setSelectedWebsiteId((currentWebsiteId) => {
          if (
            currentWebsiteId &&
            nextWebsites.some((website) => website.id === currentWebsiteId)
          ) {
            return currentWebsiteId;
          }

          return nextWebsites[0]?.id ?? "";
        });

        return true;
      } catch (fetchError) {
        setWebsiteError(getWebsiteApiErrorMessage(fetchError));
        return false;
      } finally {
        setHasLoadedWebsites(true);
      }
    },
    [cacheScope],
  );

  const loadFirstVideoPage = useCallback(
    async (search: string, bypassCache = false): Promise<boolean> => {
      const requestVersion = videoDatasetVersionRef.current + 1;
      videoDatasetVersionRef.current = requestVersion;
      setVideoPage(1);
      setIsLoadingMoreVideos(false);

      if (hasLoadedVideosRef.current) {
        setIsVideoRefreshing(true);
      }

      try {
        setVideoError(null);
        const params = getDashboardVideoParams(1, search);
        const response = await loadDashboardVideoPage({
          scope: cacheScope,
          params,
          bypassCache,
          fetcher: () => getVideos(params),
        });

        if (videoDatasetVersionRef.current !== requestVersion) {
          return true;
        }

        setVideos(response.items.filter(isShareableVideo));
        setVideoMeta({
          total: response.meta.total,
          totalPages: response.meta.totalPages,
        });
        setVideoPage(response.meta.page);

        return true;
      } catch (fetchError) {
        if (videoDatasetVersionRef.current === requestVersion) {
          setVideoError(getWebsiteApiErrorMessage(fetchError));
        }

        return false;
      } finally {
        hasLoadedVideosRef.current = true;
        setHasLoadedVideos(true);

        if (videoDatasetVersionRef.current === requestVersion) {
          setIsVideoRefreshing(false);
        }
      }
    },
    [cacheScope],
  );

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedVideoSearch(videoSearchQuery.trim());
    }, DASHBOARD_VIDEO_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(debounceTimer);
  }, [videoSearchQuery]);

  useEffect(() => {
    void loadFirstVideoPage(debouncedVideoSearch);
  }, [debouncedVideoSearch, loadFirstVideoPage]);

  const handleVideoToggle = useCallback((videoId: string): void => {
    setSelectedVideoIds((currentVideoIds) =>
      currentVideoIds.includes(videoId)
        ? currentVideoIds.filter((currentVideoId) => currentVideoId !== videoId)
        : [...currentVideoIds, videoId],
    );
  }, []);

  const handleLoadMoreVideos = useCallback(async (): Promise<void> => {
    const isSearchPending = videoSearchQuery.trim() !== debouncedVideoSearch;

    if (
      isLoadingMoreVideos ||
      isVideoRefreshing ||
      isSearchPending ||
      videoPage >= videoMeta.totalPages ||
      videoMeta.totalPages === 0
    ) {
      return;
    }

    const requestVersion = videoDatasetVersionRef.current;
    const nextPage = videoPage + 1;
    const params = getDashboardVideoParams(nextPage, debouncedVideoSearch);

    setIsLoadingMoreVideos(true);
    setVideoError(null);

    try {
      const response = await loadDashboardVideoPage({
        scope: cacheScope,
        params,
        fetcher: () => getVideos(params),
      });

      if (videoDatasetVersionRef.current !== requestVersion) {
        return;
      }

      setVideos((currentVideos) =>
        mergeVideos(currentVideos, response.items.filter(isShareableVideo)),
      );
      setVideoMeta({
        total: response.meta.total,
        totalPages: response.meta.totalPages,
      });
      setVideoPage(response.meta.page);
    } catch (fetchError) {
      if (videoDatasetVersionRef.current === requestVersion) {
        const message = getWebsiteApiErrorMessage(fetchError);
        setVideoError(message);
        toast.error(message);
      }
    } finally {
      if (videoDatasetVersionRef.current === requestVersion) {
        setIsLoadingMoreVideos(false);
      }
    }
  }, [
    cacheScope,
    debouncedVideoSearch,
    isLoadingMoreVideos,
    isVideoRefreshing,
    videoSearchQuery,
    videoMeta.totalPages,
    videoPage,
  ]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    const nextSearch = videoSearchQuery.trim();
    setDebouncedVideoSearch(nextSearch);

    const [websitesLoaded, videosLoaded] = await Promise.all([
      loadWebsites(true),
      loadFirstVideoPage(nextSearch, true),
    ]);

    if (websitesLoaded && videosLoaded) {
      toast.success("Đã tải lại dữ liệu Dashboard.");
    } else {
      toast.error("Không thể tải lại đầy đủ dữ liệu Dashboard.");
    }

    setIsRefreshing(false);
  }, [loadFirstVideoPage, loadWebsites, videoSearchQuery]);

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

  const isInitialLoading = !hasLoadedWebsites || !hasLoadedVideos;
  const error = videoError ?? websiteError;
  const isVideoSearchPending = videoSearchQuery.trim() !== debouncedVideoSearch;
  const isVideoBusy = isVideoRefreshing || isVideoSearchPending;
  const hasMoreVideos =
    !isVideoBusy &&
    videoMeta.totalPages > 0 &&
    videoPage < videoMeta.totalPages;

  if (isInitialLoading) {
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
          disabled={isRefreshing}
          onClick={() => void handleRefresh()}
        >
          <RefreshCcw
            className={["size-4", isRefreshing ? "animate-spin" : ""].join(" ")}
          />
          {isRefreshing ? "Đang tải..." : "Tải lại"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-(--admin-danger-soft) bg-(--admin-danger-soft) p-4 text-sm text-(--admin-danger)">
          <div>{error}</div>
          <Button
            className="mt-3"
            type="button"
            variant="outline"
            onClick={() => void handleRefresh()}
          >
            Thử lại
          </Button>
        </div>
      ) : null}

      <ShareLinkComposer
        hasMoreVideos={hasMoreVideos}
        isLoadingMoreVideos={isLoadingMoreVideos}
        isSubmitting={isSubmitting}
        isVideoRefreshing={isVideoBusy}
        selectedVideoIds={selectedVideoIds}
        selectedWebsiteId={selectedWebsiteId}
        totalVideos={videoMeta.total}
        videoSearchQuery={videoSearchQuery}
        videos={videos}
        websites={websites}
        onLoadMoreVideos={() => void handleLoadMoreVideos()}
        onSubmit={handleCreateShareLink}
        onVideoSearchChange={(query) => {
          setVideoSearchQuery(query);
          setVideoPage(1);
        }}
        onVideoToggle={handleVideoToggle}
        onWebsiteChange={setSelectedWebsiteId}
        createdShareLink={createdShareLink}
      />
    </section>
  );
}

function getDashboardVideoParams(
  page: number,
  search: string,
): DashboardVideoCacheParams {
  return {
    page,
    limit: DASHBOARD_VIDEO_PAGE_SIZE,
    search: search || undefined,
    status: DASHBOARD_VIDEO_STATUS,
    sortBy: DASHBOARD_VIDEO_SORT_BY,
    sortOrder: DASHBOARD_VIDEO_SORT_ORDER,
  };
}

function mergeVideos(
  currentVideos: VideoAsset[],
  nextVideos: VideoAsset[],
): VideoAsset[] {
  const videosById = new Map(
    currentVideos.map((video) => [video.id, video] as const),
  );

  for (const video of nextVideos) {
    videosById.set(video.id, video);
  }

  return Array.from(videosById.values());
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
