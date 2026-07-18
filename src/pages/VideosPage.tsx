import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { AdminReadOnlyNotice } from "@/components/common/AdminReadOnlyNotice";
import { Button } from "@/components/ui/button";
import { LazyModalFallback } from "@/components/common/LazyModalFallback";
import { Input } from "@/components/ui/input";
import { useAdminPermission } from "@/features/auth/useAdminPermission";
import { VideoCard } from "@/features/videos/components/VideoCard";
import { VideoCardSkeleton } from "@/features/videos/components/VideoCardSkeleton";
import { VideosEmptyState } from "@/features/videos/components/VideosEmptyState";
import { VideosErrorState } from "@/features/videos/components/VideosErrorState";
import {
  getApiErrorMessage,
  getVideos,
  updateVideoStatus,
} from "@/features/videos/videoApi";
import {
  VIDEO_STATUS_OPTIONS,
  type VideoAsset,
  type VideoStatus,
  type VideosListResponse,
} from "@/features/videos/videoTypes";
import {
  isValidVideoFilterKey,
  normalizeVideoFilterKeyInput,
  VIDEO_FILTER_KEY_EXAMPLES,
  VIDEO_FILTER_KEY_MAX_LENGTH,
} from "@/features/videos/videoFilterKeyUtils";
import { isApiRequestCanceled } from "@/lib/api/apiError";

const DEFAULT_VIDEO_STATUS_FILTER: VideoStatus = "READY";
const VIDEOS_SEARCH_MIN_LENGTH = 2;
const VIDEOS_SEARCH_MAX_LENGTH = 80;

const LazyCreateVideoModal = lazy(() =>
  import("@/features/videos/components/CreateVideoModal").then((module) => ({
    default: module.CreateVideoModal,
  })),
);

type StatusActionTarget = Extract<VideoStatus, "READY" | "DISABLED">;

type VideoListQueryState = {
  page: number;
  status: VideoStatus;
  search: string;
  filterKey: string;
};

type VideoListQueryUpdate = Partial<{
  page: number;
  status: VideoStatus;
  search: string;
  filterKey: string;
}>;

type VideoListNavigationState = {
  fromVideoList: string;
};

function normalizeVideoSearchInput(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, VIDEOS_SEARCH_MAX_LENGTH);
}

function parseVideoListPage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) {
    return 1;
  }

  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

function isVideoStatus(value: string | null): value is VideoStatus {
  return VIDEO_STATUS_OPTIONS.some((status) => status === value);
}

function parseVideoListQuery(
  searchParams: URLSearchParams,
): VideoListQueryState {
  const rawStatus = searchParams.get("status");
  const rawSearch = normalizeVideoSearchInput(searchParams.get("search") ?? "");
  const normalizedFilterKey = normalizeVideoFilterKeyInput(
    searchParams.get("filterKey") ?? "",
  );

  return {
    page: parseVideoListPage(searchParams.get("page")),
    status: isVideoStatus(rawStatus) ? rawStatus : DEFAULT_VIDEO_STATUS_FILTER,
    search: rawSearch.length >= VIDEOS_SEARCH_MIN_LENGTH ? rawSearch : "",
    filterKey: isValidVideoFilterKey(normalizedFilterKey)
      ? normalizedFilterKey
      : "",
  };
}

function buildVideoListSearchParams(
  query: VideoListQueryState,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (query.page > 1) {
    searchParams.set("page", String(query.page));
  }

  if (query.status !== DEFAULT_VIDEO_STATUS_FILTER) {
    searchParams.set("status", query.status);
  }

  if (query.search) {
    searchParams.set("search", query.search);
  }

  if (query.filterKey) {
    searchParams.set("filterKey", query.filterKey);
  }

  return searchParams;
}

const videoStatusLabels: Record<VideoStatus, string> = {
  DISABLED: "Đã vô hiệu hóa",
  DRAFT: "Nháp",
  FAILED: "Lỗi",
  PROCESSING: "Đang xử lý",
  READY: "Sẵn sàng",
};

function getTabClass(isActive: boolean): string {
  return [
    "inline-flex h-9 items-center rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-focus-ring)",
    isActive
      ? "border-(--admin-primary) bg-(--admin-primary-soft) font-semibold text-(--admin-primary)"
      : "border-(--admin-border) bg-(--admin-surface) font-medium text-(--admin-text) hover:border-(--admin-border-strong) hover:text-(--admin-text-strong)",
  ].join(" ");
}

export function VideosPage() {
  const canWriteVideos = useAdminPermission("video.write");
  const canUploadVideos = useAdminPermission("upload.write");
  const canCreateVideos = canWriteVideos && canUploadVideos;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const videoListQuery = useMemo(
    () => parseVideoListQuery(searchParams),
    [searchParams],
  );
  const {
    page,
    status: statusFilter,
    search: appliedSearch,
    filterKey: appliedFilterKey,
  } = videoListQuery;
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [meta, setMeta] = useState<VideosListResponse["meta"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusActionVideo, setStatusActionVideo] = useState<VideoAsset | null>(
    null,
  );
  const [statusActionTarget, setStatusActionTarget] =
    useState<StatusActionTarget | null>(null);
  const [statusUpdatingVideoId, setStatusUpdatingVideoId] = useState<
    string | null
  >(null);
  const [limit] = useState(20);
  const [searchInput, setSearchInput] = useState(appliedSearch);
  const [filterKeyInput, setFilterKeyInput] = useState(appliedFilterKey);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [filterKeyError, setFilterKeyError] = useState<string | null>(null);
  const videoListAbortRef = useRef<AbortController | null>(null);
  const videoListRequestVersionRef = useRef(0);
  const hasLoadedVideoListRef = useRef(false);

  useEffect(() => {
    if (canWriteVideos) {
      return;
    }

    setStatusActionVideo(null);
    setStatusActionTarget(null);
    setModalOpen(false);
  }, [canWriteVideos]);

  const updateVideoListQuery = useCallback(
    (
      update: VideoListQueryUpdate,
      options?: {
        replace?: boolean;
      },
    ) => {
      const nextQuery: VideoListQueryState = {
        page,
        status: statusFilter,
        search: appliedSearch,
        filterKey: appliedFilterKey,
        ...update,
      };

      setSearchParams(buildVideoListSearchParams(nextQuery), {
        replace: options?.replace,
      });
    },
    [appliedFilterKey, appliedSearch, page, setSearchParams, statusFilter],
  );

  useEffect(() => {
    const canonicalSearchParams = buildVideoListSearchParams(videoListQuery);

    if (canonicalSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(canonicalSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, videoListQuery]);

  useEffect(() => {
    setSearchInput(appliedSearch);
    setFilterKeyInput(appliedFilterKey);
    setSearchError(null);
    setFilterKeyError(null);
  }, [appliedFilterKey, appliedSearch]);

  const fetchVideos = useCallback(
    async (options?: { silent?: boolean }) => {
      const requestVersion = videoListRequestVersionRef.current + 1;
      videoListRequestVersionRef.current = requestVersion;
      videoListAbortRef.current?.abort();

      const abortController = new AbortController();
      videoListAbortRef.current = abortController;
      const shouldKeepCurrentContent =
        options?.silent === true || hasLoadedVideoListRef.current;

      if (shouldKeepCurrentContent) {
        setIsRefetching(true);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);
        setSearchError(null);

        const response = await getVideos(
          {
            page,
            limit,
            status: statusFilter,
            search: appliedSearch || undefined,
            filterKey: appliedFilterKey || undefined,
            sortOrder: "desc",
          },
          {
            signal: abortController.signal,
          },
        );

        if (videoListRequestVersionRef.current !== requestVersion) {
          return;
        }

        if (
          response.meta.totalPages > 0 &&
          response.meta.page > response.meta.totalPages
        ) {
          updateVideoListQuery(
            { page: response.meta.totalPages },
            { replace: true },
          );
          return;
        }

        setVideos(response.items);
        setMeta(response.meta);
        hasLoadedVideoListRef.current = true;
      } catch (fetchError) {
        if (
          videoListRequestVersionRef.current !== requestVersion ||
          isApiRequestCanceled(fetchError)
        ) {
          return;
        }

        if (appliedSearch || appliedFilterKey) {
          if (appliedFilterKey) {
            setSearchError("Không thể lọc video. Vui lòng thử lại.");
            return;
          }
          setSearchError("Không thể tìm video. Vui lòng thử lại.");
          return;
        }

        setError(getApiErrorMessage(fetchError));
      } finally {
        if (videoListRequestVersionRef.current === requestVersion) {
          setIsLoading(false);
          setIsRefetching(false);

          if (videoListAbortRef.current === abortController) {
            videoListAbortRef.current = null;
          }
        }
      }
    },
    [
      appliedFilterKey,
      appliedSearch,
      limit,
      page,
      statusFilter,
      updateVideoListQuery,
    ],
  );

  useEffect(() => {
    void fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    return () => {
      videoListRequestVersionRef.current += 1;
      videoListAbortRef.current?.abort();
    };
  }, []);

  const closeStatusActionModal = useCallback(() => {
    if (statusUpdatingVideoId !== null) {
      return;
    }

    setStatusActionVideo(null);
    setStatusActionTarget(null);
  }, [statusUpdatingVideoId]);

  function handleStatusChange(nextStatus: VideoStatus): void {
    if (nextStatus === statusFilter) {
      return;
    }

    updateVideoListQuery({ page: 1, status: nextStatus });
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const normalizedSearch = normalizeVideoSearchInput(searchInput);

    if (
      normalizedSearch.length > 0 &&
      normalizedSearch.length < VIDEOS_SEARCH_MIN_LENGTH
    ) {
      setSearchInput(normalizedSearch);
      setSearchError(null);
      return;
    }

    if (normalizedSearch === appliedSearch && page === 1) {
      return;
    }

    setSearchInput(normalizedSearch);
    setSearchError(null);
    updateVideoListQuery({ page: 1, search: normalizedSearch });
  }

  function handleClearSearch(): void {
    if (!searchInput && !appliedSearch) {
      return;
    }

    setSearchInput("");
    setSearchError(null);
    updateVideoListQuery({ page: 1, search: "" });
  }

  function handleFilterKeySubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const normalizedFilterKey = normalizeVideoFilterKeyInput(filterKeyInput);

    if (!isValidVideoFilterKey(normalizedFilterKey)) {
      setFilterKeyInput(normalizedFilterKey);
      setFilterKeyError(
        normalizedFilterKey === "all"
          ? "Không sử dụng all làm key lọc."
          : "Key lọc chỉ được gồm chữ thường, số và dấu gạch dưới.",
      );
      return;
    }

    if (normalizedFilterKey === appliedFilterKey && page === 1) {
      return;
    }

    setFilterKeyInput(normalizedFilterKey);
    setFilterKeyError(null);
    setSearchError(null);
    updateVideoListQuery({ page: 1, filterKey: normalizedFilterKey });
  }

  function handleClearFilterKey(): void {
    if (!filterKeyInput && !appliedFilterKey) {
      return;
    }

    setFilterKeyInput("");
    setFilterKeyError(null);
    setSearchError(null);
    updateVideoListQuery({ page: 1, filterKey: "" });
  }

  function handleRequestStatusToggle(video: VideoAsset): void {
    if (!canWriteVideos) {
      toast.error("Bạn không có quyền thay đổi trạng thái video.");
      return;
    }

    if (video.status === "READY") {
      setStatusActionVideo(video);
      setStatusActionTarget("DISABLED");
      return;
    }

    if (video.status === "DISABLED") {
      setStatusActionVideo(video);
      setStatusActionTarget("READY");
    }
  }

  async function handleConfirmStatusChange(): Promise<void> {
    if (!canWriteVideos || !statusActionVideo || !statusActionTarget) {
      return;
    }

    const selectedVideo = statusActionVideo;
    const nextStatus = statusActionTarget;

    setStatusUpdatingVideoId(selectedVideo.id);
    try {
      await updateVideoStatus(selectedVideo.id, nextStatus);
      toast.success(
        nextStatus === "DISABLED"
          ? "Đã vô hiệu hoá video."
          : "Đã kích hoạt lại video.",
      );
      setStatusActionVideo(null);
      setStatusActionTarget(null);
      await fetchVideos({ silent: true });
    } catch (statusError) {
      toast.error(getApiErrorMessage(statusError));
    } finally {
      setStatusUpdatingVideoId(null);
    }
  }

  const hasVideos = videos.length > 0;
  const currentPage = meta?.page ?? page;
  const totalPages = meta?.totalPages ?? 0;
  const pageTotalLabel = Math.max(totalPages, 1);
  const canGoPrevious = currentPage > 1 && !isLoading && !isRefetching;
  const canGoNext =
    totalPages > 0 && currentPage < totalPages && !isLoading && !isRefetching;
  const normalizedSearchInput = normalizeVideoSearchInput(searchInput);
  const normalizedFilterKeyInput = normalizeVideoFilterKeyInput(filterKeyInput);
  const isSearchInputTooShort =
    normalizedSearchInput.length > 0 &&
    normalizedSearchInput.length < VIDEOS_SEARCH_MIN_LENGTH;
  const isFilterKeyInputInvalid = !isValidVideoFilterKey(
    normalizedFilterKeyInput,
  );
  const hasAppliedSearch = appliedSearch.length > 0;
  const hasAppliedFilterKey = appliedFilterKey.length > 0;
  const isSearchButtonDisabled =
    isLoading ||
    isRefetching ||
    isSearchInputTooShort ||
    (normalizedSearchInput === appliedSearch && page === 1);
  const isFilterKeyButtonDisabled =
    isLoading ||
    isRefetching ||
    isFilterKeyInputInvalid ||
    (normalizedFilterKeyInput === appliedFilterKey && page === 1);
  const filterKeySuggestions = useMemo(() => {
    return Array.from(
      new Set([
        ...VIDEO_FILTER_KEY_EXAMPLES,
        ...videos
          .map((video) => video.filterKey)
          .filter((value): value is string => Boolean(value?.trim())),
      ]),
    );
  }, [videos]);
  const isStatusActionDisable = statusActionTarget === "DISABLED";
  const isStatusActionSubmitting =
    statusActionVideo !== null &&
    statusUpdatingVideoId === statusActionVideo.id;
  const statusActionTitle = isStatusActionDisable
    ? "Vô hiệu hóa video?"
    : "Kích hoạt lại video?";
  const statusActionConfirmLabel = isStatusActionDisable
    ? "Vô hiệu hóa"
    : "Kích hoạt lại";
  const hasActiveFilters = hasAppliedSearch || hasAppliedFilterKey;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-(--admin-text-strong)">
            Quản lý video
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-(--admin-text-muted)">
            Quản lý nguồn phát, trạng thái và metadata của video trong hệ thống.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            disabled={isLoading || isRefetching}
            type="button"
            variant="outline"
            onClick={() => void fetchVideos({ silent: true })}
          >
            <RefreshCcw
              className={["size-4", isRefetching ? "animate-spin" : ""].join(
                " ",
              )}
            />
            Tải lại
          </Button>

          {canCreateVideos ? (
            <Button type="button" onClick={() => setModalOpen(true)}>
              <Plus className="size-4" />
              Thêm video
            </Button>
          ) : null}
        </div>
      </div>

      {!canWriteVideos ? <AdminReadOnlyNotice /> : null}

      <div className="space-y-4 rounded-lg border border-(--admin-border) bg-(--admin-surface) p-4 shadow-sm">
        <div
          aria-label="Lọc video theo trạng thái"
          className="flex flex-wrap gap-2"
          role="tablist"
        >
          {VIDEO_STATUS_OPTIONS.map((status) => {
            const isActive = statusFilter === status;

            return (
              <button
                key={status}
                aria-selected={isActive}
                className={getTabClass(isActive)}
                role="tab"
                type="button"
                onClick={() => handleStatusChange(status)}
              >
                {videoStatusLabels[status]}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <form
              className="flex w-full flex-col gap-2 sm:flex-row"
              onSubmit={handleSearchSubmit}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--admin-text-muted)" />
                <Input
                  aria-describedby={
                    isSearchInputTooShort ? "videos-search-hint" : undefined
                  }
                  aria-label="Tìm video theo tiêu đề"
                  className="h-10 bg-(--admin-input-bg) pl-9 pr-9 text-(--admin-text-strong)"
                  id="videos-search"
                  name="videosSearch"
                  placeholder="Tìm theo tiêu đề video"
                  type="search"
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(
                      event.target.value.slice(0, VIDEOS_SEARCH_MAX_LENGTH),
                    )
                  }
                />
                {searchInput ? (
                  <button
                    aria-label="Xóa tìm kiếm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-(--admin-text-muted) transition hover:bg-(--admin-surface-alt) hover:text-(--admin-text-strong)"
                    type="button"
                    onClick={handleClearSearch}
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>

              <Button
                disabled={isSearchButtonDisabled}
                type="submit"
                variant="outline"
              >
                <Search className="size-4" />
                Tìm kiếm
              </Button>
            </form>
            {isSearchInputTooShort ? (
              <p
                className="mt-2 text-xs text-(--admin-text-muted)"
                id="videos-search-hint"
              >
                Nhập ít nhất {VIDEOS_SEARCH_MIN_LENGTH} ký tự để tìm video.
              </p>
            ) : null}
          </div>

          <div>
            <form
              className="flex w-full flex-col gap-2 sm:flex-row"
              onSubmit={handleFilterKeySubmit}
            >
              <div className="relative flex-1">
                <Input
                  aria-describedby={
                    filterKeyError || isFilterKeyInputInvalid
                      ? "videos-filter-key-error"
                      : undefined
                  }
                  aria-invalid={
                    filterKeyError || isFilterKeyInputInvalid ? true : undefined
                  }
                  aria-label="Lọc video theo key phân loại"
                  className="h-10 bg-(--admin-input-bg) pr-9 text-(--admin-text-strong)"
                  id="videos-filter-key"
                  list="video-filter-key-suggestions"
                  name="videosFilterKey"
                  placeholder="Lọc theo key, ví dụ: sml, msa"
                  value={filterKeyInput}
                  onChange={(event) => {
                    setFilterKeyInput(
                      event.target.value.slice(0, VIDEO_FILTER_KEY_MAX_LENGTH),
                    );
                    setFilterKeyError(null);
                  }}
                />
                {filterKeyInput ? (
                  <button
                    aria-label="Xóa key lọc"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-(--admin-text-muted) transition hover:bg-(--admin-surface-alt) hover:text-(--admin-text-strong)"
                    type="button"
                    onClick={handleClearFilterKey}
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
                <datalist id="video-filter-key-suggestions">
                  {filterKeySuggestions.map((filterKey) => (
                    <option key={filterKey} value={filterKey} />
                  ))}
                </datalist>
              </div>

              <Button
                disabled={isFilterKeyButtonDisabled}
                type="submit"
                variant="outline"
              >
                Lọc theo key
              </Button>
            </form>
            {filterKeyError || isFilterKeyInputInvalid ? (
              <p
                className="mt-2 text-xs text-(--admin-danger)"
                id="videos-filter-key-error"
              >
                {filterKeyError ??
                  (normalizedFilterKeyInput === "all"
                    ? "Không sử dụng all làm key lọc."
                    : "Key lọc chỉ được gồm chữ thường, số và dấu gạch dưới.")}
              </p>
            ) : null}
          </div>
        </div>

        {searchError ? (
          <div
            className="flex items-center justify-between gap-3 rounded-md border border-(--admin-warning) bg-(--admin-warning-soft) px-3 py-2 text-xs text-(--admin-text-strong)"
            role="alert"
          >
            <span>{searchError}</span>
            <button
              className="shrink-0 font-medium underline-offset-2 hover:underline"
              type="button"
              onClick={() => void fetchVideos({ silent: true })}
            >
              Thử lại
            </button>
          </div>
        ) : null}

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-(--admin-text-muted)">
              Bộ lọc đang áp dụng:
            </span>
            {hasAppliedSearch ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-(--admin-border) bg-(--admin-surface-alt) py-1 pl-3 pr-1 text-xs text-(--admin-text-strong)">
                Tìm kiếm: “{appliedSearch}”
                <button
                  aria-label="Xóa bộ lọc tìm kiếm"
                  className="inline-flex size-4 items-center justify-center rounded-full text-(--admin-text-muted) transition hover:bg-(--admin-hover-row) hover:text-(--admin-text-strong)"
                  type="button"
                  onClick={handleClearSearch}
                >
                  <X className="size-3" />
                </button>
              </span>
            ) : null}
            {hasAppliedFilterKey ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-(--admin-border) bg-(--admin-surface-alt) py-1 pl-3 pr-1 text-xs text-(--admin-text-strong)">
                Key: {appliedFilterKey}
                <button
                  aria-label="Xóa bộ lọc theo key"
                  className="inline-flex size-4 items-center justify-center rounded-full text-(--admin-text-muted) transition hover:bg-(--admin-hover-row) hover:text-(--admin-text-strong)"
                  type="button"
                  onClick={handleClearFilterKey}
                >
                  <X className="size-3" />
                </button>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 text-sm text-(--admin-text) sm:flex-row sm:items-center sm:justify-between">
        <p>
          Tổng cộng:{" "}
          <span className="font-medium text-(--admin-text-strong)">
            {meta?.total ?? videos.length}
          </span>{" "}
          video
        </p>

        {totalPages > 0 ? (
          <nav
            aria-label="Phân trang video"
            className="flex items-center gap-2"
          >
            <Button
              disabled={!canGoPrevious}
              size="sm"
              type="button"
              variant="outline"
              onClick={() =>
                updateVideoListQuery({ page: Math.max(1, page - 1) })
              }
            >
              <ChevronLeft className="size-4" />
              Trước
            </Button>

            <span className="min-w-24 text-center text-(--admin-text-muted)">
              Trang {currentPage}/{pageTotalLabel}
            </span>

            <Button
              disabled={!canGoNext}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => updateVideoListQuery({ page: page + 1 })}
            >
              Sau
              <ChevronRight className="size-4" />
            </Button>
          </nav>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <VideoCardSkeleton key={index} />
          ))}
        </div>
      ) : error ? (
        <VideosErrorState message={error} onRetry={() => void fetchVideos()} />
      ) : !hasVideos && hasActiveFilters ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-(--admin-border-strong) bg-(--admin-surface) px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-(--admin-text-strong)">
            Không có video phù hợp
          </h2>
          <p className="mt-2 max-w-md text-sm text-(--admin-text)">
            {hasAppliedSearch && hasAppliedFilterKey
              ? "Không có video khớp với cả từ khóa tìm kiếm và key đang lọc."
              : hasAppliedSearch
                ? "Không có video khớp với từ khóa tìm kiếm."
                : "Không có video khớp với key đang lọc."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {hasAppliedSearch ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearSearch}
              >
                Xóa tìm kiếm
              </Button>
            ) : null}
            {hasAppliedFilterKey ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilterKey}
              >
                Xóa key lọc
              </Button>
            ) : null}
          </div>
        </section>
      ) : !hasVideos && statusFilter !== DEFAULT_VIDEO_STATUS_FILTER ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-(--admin-border-strong) bg-(--admin-surface) px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-(--admin-text-strong)">
            Không có video ở trạng thái này
          </h2>
          <p className="mt-2 max-w-md text-sm text-(--admin-text)">
            Hiện chưa có video nào ở trạng thái “
            {videoStatusLabels[statusFilter]}
            ”.
          </p>
        </section>
      ) : !hasVideos ? (
        <VideosEmptyState
          onCreate={canCreateVideos ? () => setModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              isStatusUpdating={statusUpdatingVideoId === video.id}
              onOpen={(selectedVideo) => {
                const returnTo = `${location.pathname}${location.search}`;
                const navigationState: VideoListNavigationState = {
                  fromVideoList: returnTo,
                };

                navigate(`/videos/${selectedVideo.id}`, {
                  state: navigationState,
                });
              }}
              onRequestStatusToggle={
                canWriteVideos ? handleRequestStatusToggle : undefined
              }
            />
          ))}
        </div>
      )}

      <ConfirmActionDialog
        confirmLabel={statusActionConfirmLabel}
        description={
          statusActionVideo ? (
            <span className="block space-y-2">
              <span className="block font-medium text-(--admin-text-strong)">
                {statusActionVideo.title}
              </span>
              <span className="block">
                {isStatusActionDisable
                  ? "Video sẽ chuyển sang trạng thái DISABLED. Thao tác này chỉ ngừng sử dụng video trong hệ thống, không xóa metadata và không xóa file video/thumbnail khỏi server storage/NVMe. Muốn giải phóng dung lượng, hãy dùng Purge ở trang chi tiết video."
                  : "Video sẽ trở lại trạng thái READY. Nếu video đang được gán vào website hoặc share link hợp lệ, video có thể hiển thị lại cho người xem theo quyền truy cập tương ứng."}
              </span>
            </span>
          ) : null
        }
        isSubmitting={isStatusActionSubmitting}
        open={
          canWriteVideos &&
          statusActionVideo !== null &&
          statusActionTarget !== null
        }
        title={statusActionTitle}
        variant={isStatusActionDisable ? "warning" : "default"}
        onConfirm={handleConfirmStatusChange}
        onOpenChange={(next) => {
          if (!next) {
            closeStatusActionModal();
          }
        }}
      />

      {modalOpen && canCreateVideos ? (
        <Suspense
          fallback={<LazyModalFallback label="Đang tải biểu mẫu video..." />}
        >
          <LazyCreateVideoModal
            open
            onOpenChange={setModalOpen}
            onCreated={() => void fetchVideos({ silent: true })}
          />
        </Suspense>
      ) : null}
    </section>
  );
}
