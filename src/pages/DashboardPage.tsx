import { RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  loadDashboardActiveWebsites,
  loadDashboardVideoPage,
  type DashboardVideoCacheParams,
} from "@/features/dashboard/dashboardCache";
import { ShareLinkComposer } from "@/features/dashboard/components/ShareLinkComposer";
import type {
  DashboardVideoSearchStatus,
  ShareLinkComposerPayload,
} from "@/features/dashboard/dashboardTypes";
import { getVideos } from "@/features/videos/videoApi";
import {
  isValidVideoFilterKey,
  normalizeVideoFilterKeyInput,
  VIDEO_FILTER_KEY_MAX_LENGTH,
} from "@/features/videos/videoFilterKeyUtils";
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
import { isApiRequestCanceled } from "@/lib/api/apiError";
import { useAppSelector } from "@/store/hooks";

const DASHBOARD_VIDEO_PAGE_SIZE = 24;
const DASHBOARD_VIDEO_SEARCH_DEBOUNCE_MS = 400;
const DASHBOARD_VIDEO_SEARCH_MIN_LENGTH = 2;
const DASHBOARD_VIDEO_SEARCH_MAX_LENGTH = 80;
const DASHBOARD_VIDEO_STATUS = "READY" as const;
const DASHBOARD_VIDEO_SORT_BY = "createdAt" as const;
const DASHBOARD_VIDEO_SORT_ORDER = "desc" as const;
const DASHBOARD_VIDEO_SEARCH_ERROR_MESSAGE =
  "Không thể tìm video lúc này. Vui lòng thử lại.";
const DASHBOARD_VIDEO_FILTER_ERROR_MESSAGE =
  "Không thể lọc video lúc này. Vui lòng thử lại.";

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
  const [videoFilterKey, setVideoFilterKey] = useState("");
  const [debouncedVideoFilterKey, setDebouncedVideoFilterKey] = useState("");
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
  const [videoSearchError, setVideoSearchError] = useState<string | null>(null);
  const videoDatasetVersionRef = useRef(0);
  const videoRequestAbortRef = useRef<AbortController | null>(null);
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
    async (
      search: string,
      filterKey: string,
      bypassCache = false,
    ): Promise<boolean> => {
      const normalizedSearch = normalizeDashboardVideoSearch(search);
      const normalizedFilterKey = normalizeVideoFilterKeyInput(filterKey);
      const requestVersion = videoDatasetVersionRef.current + 1;
      videoDatasetVersionRef.current = requestVersion;
      videoRequestAbortRef.current?.abort();
      videoRequestAbortRef.current = null;
      setVideoPage(1);
      setIsLoadingMoreVideos(false);
      setVideoSearchError(null);

      if (isShortDashboardVideoSearch(normalizedSearch)) {
        setVideoError(null);
        setIsVideoRefreshing(false);
        return true;
      }

      if (!isValidVideoFilterKey(normalizedFilterKey)) {
        setVideoError(null);
        setVideoSearchError(
          "Key lọc chỉ được gồm chữ thường, số và dấu gạch dưới.",
        );
        setIsVideoRefreshing(false);
        return true;
      }

      if (hasLoadedVideosRef.current) {
        setIsVideoRefreshing(true);
      }

      const abortController = new AbortController();
      videoRequestAbortRef.current = abortController;
      let didSucceed = false;
      let didCancel = false;

      try {
        setVideoError(null);
        const params = getDashboardVideoParams(
          1,
          normalizedSearch,
          normalizedFilterKey,
        );
        const response = await loadDashboardVideoPage({
          scope: cacheScope,
          params,
          bypassCache,
          dedupeRequests: false,
          fetcher: () => getVideos(params, { signal: abortController.signal }),
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
        didSucceed = true;

        return true;
      } catch (fetchError) {
        if (isApiRequestCanceled(fetchError)) {
          didCancel = true;
          return hasLoadedVideosRef.current;
        }

        if (videoDatasetVersionRef.current === requestVersion) {
          const hasScopedVideoQuery =
            normalizedSearch.length > 0 || normalizedFilterKey.length > 0;
          const message = normalizedSearch
            ? DASHBOARD_VIDEO_SEARCH_ERROR_MESSAGE
            : normalizedFilterKey
              ? DASHBOARD_VIDEO_FILTER_ERROR_MESSAGE
              : getWebsiteApiErrorMessage(fetchError);

          if (hasLoadedVideosRef.current || hasScopedVideoQuery) {
            setVideoSearchError(message);
          } else {
            setVideoError(message);
          }
        }

        return false;
      } finally {
        if (videoRequestAbortRef.current === abortController) {
          videoRequestAbortRef.current = null;
        }

        if (videoDatasetVersionRef.current === requestVersion) {
          if (didSucceed || !didCancel || hasLoadedVideosRef.current) {
            hasLoadedVideosRef.current = true;
            setHasLoadedVideos(true);
          }

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
    return () => {
      videoDatasetVersionRef.current += 1;
      videoRequestAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedVideoSearch(normalizeDashboardVideoSearch(videoSearchQuery));
    }, DASHBOARD_VIDEO_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(debounceTimer);
  }, [videoSearchQuery]);

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedVideoFilterKey(normalizeVideoFilterKeyInput(videoFilterKey));
    }, DASHBOARD_VIDEO_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(debounceTimer);
  }, [videoFilterKey]);

  useEffect(() => {
    void loadFirstVideoPage(debouncedVideoSearch, debouncedVideoFilterKey);
  }, [debouncedVideoFilterKey, debouncedVideoSearch, loadFirstVideoPage]);

  const handleVideoToggle = useCallback((videoId: string): void => {
    setSelectedVideoIds((currentVideoIds) =>
      currentVideoIds.includes(videoId)
        ? currentVideoIds.filter((currentVideoId) => currentVideoId !== videoId)
        : [...currentVideoIds, videoId],
    );
  }, []);

  const handleLoadMoreVideos = useCallback(async (): Promise<void> => {
    const normalizedSearchQuery =
      normalizeDashboardVideoSearch(videoSearchQuery);
    const normalizedFilterKey = normalizeVideoFilterKeyInput(videoFilterKey);
    const isSearchPending = normalizedSearchQuery !== debouncedVideoSearch;
    const isFilterKeyPending = normalizedFilterKey !== debouncedVideoFilterKey;
    const isSearchTooShort = isShortDashboardVideoSearch(normalizedSearchQuery);

    if (
      isLoadingMoreVideos ||
      isVideoRefreshing ||
      isSearchPending ||
      isFilterKeyPending ||
      isSearchTooShort ||
      videoSearchError ||
      videoPage >= videoMeta.totalPages ||
      videoMeta.totalPages === 0
    ) {
      return;
    }

    const requestVersion = videoDatasetVersionRef.current;
    const nextPage = videoPage + 1;
    const params = getDashboardVideoParams(
      nextPage,
      debouncedVideoSearch,
      debouncedVideoFilterKey,
    );

    setIsLoadingMoreVideos(true);
    setVideoSearchError(null);

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
      if (isApiRequestCanceled(fetchError)) {
        return;
      }

      if (videoDatasetVersionRef.current === requestVersion) {
        const message = debouncedVideoSearch
          ? DASHBOARD_VIDEO_SEARCH_ERROR_MESSAGE
          : debouncedVideoFilterKey
            ? DASHBOARD_VIDEO_FILTER_ERROR_MESSAGE
            : getWebsiteApiErrorMessage(fetchError);
        setVideoSearchError(message);
      }
    } finally {
      if (videoDatasetVersionRef.current === requestVersion) {
        setIsLoadingMoreVideos(false);
      }
    }
  }, [
    cacheScope,
    debouncedVideoFilterKey,
    debouncedVideoSearch,
    isLoadingMoreVideos,
    isVideoRefreshing,
    videoFilterKey,
    videoSearchQuery,
    videoSearchError,
    videoMeta.totalPages,
    videoPage,
  ]);

  const handleVideoSearchChange = useCallback((query: string): void => {
    videoDatasetVersionRef.current += 1;
    videoRequestAbortRef.current?.abort();
    videoRequestAbortRef.current = null;
    setIsVideoRefreshing(false);
    setIsLoadingMoreVideos(false);
    setVideoSearchError(null);
    setVideoSearchQuery(query.slice(0, DASHBOARD_VIDEO_SEARCH_MAX_LENGTH));
    setVideoPage(1);
  }, []);

  const handleVideoFilterKeyChange = useCallback((value: string): void => {
    videoDatasetVersionRef.current += 1;
    videoRequestAbortRef.current?.abort();
    videoRequestAbortRef.current = null;
    setIsVideoRefreshing(false);
    setIsLoadingMoreVideos(false);
    setVideoSearchError(null);
    setVideoFilterKey(value.slice(0, VIDEO_FILTER_KEY_MAX_LENGTH));
    setVideoPage(1);
  }, []);

  const handleRetryVideoSearch = useCallback((): void => {
    const nextSearch = normalizeDashboardVideoSearch(videoSearchQuery);
    const nextFilterKey = normalizeVideoFilterKeyInput(videoFilterKey);

    if (isShortDashboardVideoSearch(nextSearch)) {
      setVideoSearchError(null);
      return;
    }

    setDebouncedVideoSearch(nextSearch);
    setDebouncedVideoFilterKey(nextFilterKey);
    void loadFirstVideoPage(nextSearch, nextFilterKey, true);
  }, [loadFirstVideoPage, videoFilterKey, videoSearchQuery]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    const nextSearch = normalizeDashboardVideoSearch(videoSearchQuery);
    const nextFilterKey = normalizeVideoFilterKeyInput(videoFilterKey);
    setDebouncedVideoSearch(nextSearch);
    setDebouncedVideoFilterKey(nextFilterKey);

    const [websitesLoaded, videosLoaded] = await Promise.all([
      loadWebsites(true),
      loadFirstVideoPage(nextSearch, nextFilterKey, true),
    ]);

    if (websitesLoaded && videosLoaded) {
      toast.success("Đã tải lại dữ liệu Dashboard.");
    } else {
      toast.error("Không thể tải lại đầy đủ dữ liệu Dashboard.");
    }

    setIsRefreshing(false);
  }, [loadFirstVideoPage, loadWebsites, videoFilterKey, videoSearchQuery]);

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
  const error = websiteError ?? videoError;
  const normalizedVideoSearchQuery =
    normalizeDashboardVideoSearch(videoSearchQuery);
  const normalizedVideoFilterKey = normalizeVideoFilterKeyInput(videoFilterKey);
  const isVideoSearchTooShort = isShortDashboardVideoSearch(
    normalizedVideoSearchQuery,
  );
  const isVideoFilterKeyInvalid = !isValidVideoFilterKey(
    normalizedVideoFilterKey,
  );
  const isVideoSearchPending =
    normalizedVideoSearchQuery !== debouncedVideoSearch;
  const isVideoFilterKeyPending =
    normalizedVideoFilterKey !== debouncedVideoFilterKey;
  const isVideoBusy =
    !isVideoSearchTooShort &&
    !isVideoFilterKeyInvalid &&
    (isVideoRefreshing || isVideoSearchPending || isVideoFilterKeyPending);
  const videoSearchStatus: DashboardVideoSearchStatus = isVideoSearchTooShort
    ? "too-short"
    : isVideoFilterKeyInvalid || videoSearchError
      ? "error"
      : isVideoBusy
        ? "loading"
        : "idle";
  const hasMoreVideos =
    !isVideoBusy &&
    !isVideoSearchTooShort &&
    !isVideoFilterKeyInvalid &&
    !videoSearchError &&
    videoMeta.totalPages > 0 &&
    videoPage < videoMeta.totalPages;

  if (isInitialLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-(--admin-text-strong)">
            Tổng quan
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-(--admin-text-muted)">
            Tạo và quản lý quyền truy cập chia sẻ video qua share link.
          </p>
        </div>
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
        videoFilterKey={videoFilterKey}
        videoSearchError={
          isVideoFilterKeyInvalid
            ? "Key lọc chỉ được gồm chữ thường, số và dấu gạch dưới."
            : videoSearchError
        }
        videoSearchMinLength={DASHBOARD_VIDEO_SEARCH_MIN_LENGTH}
        videoSearchQuery={videoSearchQuery}
        videoSearchStatus={videoSearchStatus}
        videos={videos}
        websites={websites}
        onLoadMoreVideos={() => void handleLoadMoreVideos()}
        onRetryVideoSearch={handleRetryVideoSearch}
        onSubmit={handleCreateShareLink}
        onVideoFilterKeyChange={handleVideoFilterKeyChange}
        onVideoSearchChange={handleVideoSearchChange}
        onVideoToggle={handleVideoToggle}
        onWebsiteChange={setSelectedWebsiteId}
        createdShareLink={createdShareLink}
      />
    </section>
  );
}

function normalizeDashboardVideoSearch(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, DASHBOARD_VIDEO_SEARCH_MAX_LENGTH);
}

function isShortDashboardVideoSearch(value: string): boolean {
  return value.length > 0 && value.length < DASHBOARD_VIDEO_SEARCH_MIN_LENGTH;
}

function getDashboardVideoParams(
  page: number,
  search: string,
  filterKey: string,
): DashboardVideoCacheParams {
  const normalizedSearch = normalizeDashboardVideoSearch(search);
  const normalizedFilterKey = normalizeVideoFilterKeyInput(filterKey);

  return {
    page,
    limit: DASHBOARD_VIDEO_PAGE_SIZE,
    search: normalizedSearch || undefined,
    filterKey: normalizedFilterKey || undefined,
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
