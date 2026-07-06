import {
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LazyModalFallback } from "@/components/common/LazyModalFallback";
import { Input } from "@/components/ui/input";
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

function normalizeVideoSearchInput(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, VIDEOS_SEARCH_MAX_LENGTH);
}

const videoStatusLabels: Record<VideoStatus, string> = {
  DISABLED: "Đã tắt",
  DRAFT: "Nháp",
  FAILED: "Lỗi",
  PROCESSING: "Đang xử lý",
  READY: "Sẵn sàng",
};

function getTabClass(isActive: boolean): string {
  return [
    "inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors",
    isActive
      ? "border-(--admin-primary) bg-(--admin-primary-soft) text-(--admin-primary)"
      : "border-(--admin-border) bg-(--admin-surface) text-(--admin-text) hover:border-(--admin-border-strong) hover:text-(--admin-text-strong)",
  ].join(" ");
}

export function VideosPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [meta, setMeta] = useState<VideosListResponse["meta"] | null>(null);
  const [statusFilter, setStatusFilter] = useState<VideoStatus>(
    DEFAULT_VIDEO_STATUS_FILTER,
  );
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
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filterKeyInput, setFilterKeyInput] = useState("");
  const [appliedFilterKey, setAppliedFilterKey] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [filterKeyError, setFilterKeyError] = useState<string | null>(null);
  const videoListAbortRef = useRef<AbortController | null>(null);
  const videoListRequestVersionRef = useRef(0);
  const hasLoadedVideoListRef = useRef(false);
  const statusModalRef = useRef<HTMLDivElement | null>(null);
  const statusCancelButtonRef = useRef<HTMLButtonElement | null>(null);

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
          setPage(response.meta.totalPages);
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
    [appliedFilterKey, appliedSearch, limit, page, statusFilter],
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

  useEffect(() => {
    if (!statusActionVideo || !statusActionTarget) {
      return;
    }

    const focusTimeout = window.setTimeout(() => {
      statusCancelButtonRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimeout);
  }, [statusActionVideo, statusActionTarget]);

  function handleStatusChange(nextStatus: VideoStatus): void {
    if (nextStatus === statusFilter) {
      return;
    }

    setStatusFilter(nextStatus);
    setPage(1);
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

    setAppliedSearch(normalizedSearch);
    setSearchInput(normalizedSearch);
    setSearchError(null);
    setPage(1);
  }

  function handleClearSearch(): void {
    if (!searchInput && !appliedSearch) {
      return;
    }

    setSearchInput("");
    setAppliedSearch("");
    setSearchError(null);
    setPage(1);
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

    setAppliedFilterKey(normalizedFilterKey);
    setFilterKeyInput(normalizedFilterKey);
    setFilterKeyError(null);
    setSearchError(null);
    setPage(1);
  }

  function handleClearFilterKey(): void {
    if (!filterKeyInput && !appliedFilterKey) {
      return;
    }

    setFilterKeyInput("");
    setAppliedFilterKey("");
    setFilterKeyError(null);
    setSearchError(null);
    setPage(1);
  }

  function handleRequestStatusToggle(video: VideoAsset): void {
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
    if (!statusActionVideo || !statusActionTarget) {
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

  function handleStatusModalKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
  ): void {
    if (event.key === "Escape") {
      event.preventDefault();
      closeStatusActionModal();
      return;
    }

    if (event.key !== "Tab" || !statusModalRef.current) {
      return;
    }

    const focusableElements = Array.from(
      statusModalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
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
    ? "Vô hiệu hoá video?"
    : "Kích hoạt lại video?";
  const statusActionDescription = isStatusActionDisable
    ? "Video này sẽ được chuyển sang trạng thái DISABLED. Thao tác này chỉ ngừng sử dụng video trong hệ thống, không xoá metadata và không xoá file khỏi server storage/NVMe. Nếu muốn giải phóng dung lượng, hãy dùng Purge Permanently ở trang chi tiết video."
    : "Video này sẽ được chuyển lại trạng thái READY. Nếu video đang được gán vào website hoặc share link hợp lệ, video có thể hiển thị lại cho người xem theo quyền truy cập tương ứng.";
  const statusActionConfirmLabel = isStatusActionDisable
    ? "Vô hiệu hoá"
    : "Kích hoạt lại";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-(--admin-text-strong)">
          Video Management
        </h1>

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

          <Button type="button" onClick={() => setModalOpen(true)}>
            <Plus className="size-4" />
            Thêm Video
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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

        <div className="w-full lg:max-w-md">
          <form
            className="flex w-full flex-col gap-2 sm:flex-row"
            onSubmit={handleSearchSubmit}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--admin-text-muted)" />
              <Input
                aria-label="Tìm video theo tiêu đề"
                className="h-10 bg-(--admin-surface) pl-9 pr-5 text-(--admin-text-strong)"
                placeholder="Tìm theo tiêu đề video"
                type="search"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value.slice(0, VIDEOS_SEARCH_MAX_LENGTH),
                  )
                }
              />
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
            <p className="mt-2 text-xs text-(--admin-text-muted)">
              Nhập ít nhất {VIDEOS_SEARCH_MIN_LENGTH} ký tự để tìm video.
            </p>
          ) : searchError ? (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
              <span>{searchError}</span>
              <button
                className="font-medium underline-offset-2 hover:underline"
                type="button"
                onClick={() => void fetchVideos({ silent: true })}
              >
                Thử lại
              </button>
            </div>
          ) : null}
          <form
            className="mt-3 flex w-full flex-col gap-2 sm:flex-row"
            onSubmit={handleFilterKeySubmit}
          >
            <div className="relative flex-1">
              <Input
                aria-label="Lọc video theo key"
                className="h-10 bg-(--admin-surface) pr-9 text-(--admin-text-strong)"
                list="video-filter-key-suggestions"
                placeholder="Lọc theo key: sml, msa..."
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
              Lọc key
            </Button>
          </form>
          {filterKeyError || isFilterKeyInputInvalid ? (
            <p className="mt-2 text-xs text-[var(--admin-danger)]">
              {filterKeyError ??
                (normalizedFilterKeyInput === "all"
                  ? "Không sử dụng all làm key lọc."
                  : "Key lọc chỉ được gồm chữ thường, số và dấu gạch dưới.")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm text-(--admin-text) md:flex-row md:items-center md:justify-between">
        <span>
          Tổng cộng: {meta?.total ?? videos.length} videos
          {hasAppliedSearch ? ` · Tìm kiếm: "${appliedSearch}"` : ""}
          {hasAppliedFilterKey ? ` · Key: ${appliedFilterKey}` : ""}
        </span>

        <div className="flex items-center gap-2">
          <Button
            disabled={!canGoPrevious}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
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
            onClick={() => setPage((current) => current + 1)}
          >
            Sau
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <VideoCardSkeleton key={index} />
          ))}
        </div>
      ) : error ? (
        <VideosErrorState message={error} onRetry={() => void fetchVideos()} />
      ) : !hasVideos && (hasAppliedSearch || hasAppliedFilterKey) ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-(--admin-border-strong) bg-(--admin-surface) px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-(--admin-text-strong)">
            Không có video phù hợp
          </h2>
          <p className="mt-2 max-w-md text-sm text-(--admin-text)">
            Không có video nào khớp với tìm kiếm hoặc key đang lọc.
          </p>
          {hasAppliedFilterKey ? (
            <Button
              className="mt-4"
              type="button"
              variant="outline"
              onClick={handleClearFilterKey}
            >
              Xóa key lọc
            </Button>
          ) : null}
        </section>
      ) : !hasVideos ? (
        <VideosEmptyState onCreate={() => setModalOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              isStatusUpdating={statusUpdatingVideoId === video.id}
              onOpen={(selectedVideo) =>
                navigate(`/videos/${selectedVideo.id}`)
              }
              onRequestStatusToggle={handleRequestStatusToggle}
            />
          ))}
        </div>
      )}

      {statusActionVideo && statusActionTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeStatusActionModal();
            }
          }}
        >
          <div
            ref={statusModalRef}
            aria-describedby="video-status-modal-description"
            aria-labelledby="video-status-modal-title"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-(--admin-shadow)"
            role="dialog"
            onKeyDown={handleStatusModalKeyDown}
          >
            <Button
              aria-label="Đóng"
              className="absolute right-3 top-3 text-(--admin-text-muted)"
              disabled={isStatusActionSubmitting}
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={closeStatusActionModal}
            >
              <X className="size-4" />
            </Button>

            <div className="flex gap-3 pr-8">
              <div
                className={[
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  isStatusActionDisable
                    ? "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]"
                    : "bg-[var(--admin-primary-soft)] text-[var(--admin-primary)]",
                ].join(" ")}
              >
                {isStatusActionDisable ? (
                  <Ban className="size-5" />
                ) : (
                  <RefreshCcw className="size-5" />
                )}
              </div>

              <div className="min-w-0 space-y-2">
                <h2
                  className="text-lg font-semibold text-(--admin-text-strong)"
                  id="video-status-modal-title"
                >
                  {statusActionTitle}
                </h2>
                <p className="break-words text-sm font-medium text-(--admin-text-strong)">
                  {statusActionVideo.title}
                </p>
                <p
                  className="text-sm leading-6 text-(--admin-text)"
                  id="video-status-modal-description"
                >
                  {statusActionDescription}
                </p>

                {isStatusActionDisable ? (
                  <div className="flex gap-2 rounded-lg border border-[var(--admin-danger-soft)] bg-[var(--admin-danger-soft)]/45 p-3 text-sm text-(--admin-text)">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--admin-danger)]" />
                    <p>
                      Disable không xoá file khỏi storage. Để giải phóng dung
                      lượng NVMe, mở trang chi tiết video và dùng Purge
                      Permanently.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                ref={statusCancelButtonRef}
                disabled={isStatusActionSubmitting}
                type="button"
                variant="outline"
                onClick={closeStatusActionModal}
              >
                Huỷ
              </Button>
              <Button
                disabled={isStatusActionSubmitting}
                type="button"
                variant={isStatusActionDisable ? "destructive" : "default"}
                onClick={() => void handleConfirmStatusChange()}
              >
                {isStatusActionSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {statusActionConfirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
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
