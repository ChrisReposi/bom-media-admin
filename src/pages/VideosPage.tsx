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
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateVideoModal } from "@/features/videos/components/CreateVideoModal";
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

const DEFAULT_VIDEO_STATUS_FILTER: VideoStatus = "READY";

type StatusActionTarget = Extract<VideoStatus, "READY" | "DISABLED">;

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
  const statusModalRef = useRef<HTMLDivElement | null>(null);
  const statusCancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const fetchVideos = useCallback(
    async (options?: { silent?: boolean }) => {
      if (options?.silent) {
        setIsRefetching(true);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);

        const response = await getVideos({
          page,
          limit,
          status: statusFilter,
          search: appliedSearch || undefined,
          sortOrder: "desc",
        });

        if (
          response.meta.totalPages > 0 &&
          response.meta.page > response.meta.totalPages
        ) {
          setPage(response.meta.totalPages);
          return;
        }

        setVideos(response.items);
        setMeta(response.meta);
      } catch (fetchError) {
        setError(getApiErrorMessage(fetchError));
      } finally {
        setIsLoading(false);
        setIsRefetching(false);
      }
    },
    [appliedSearch, limit, page, statusFilter],
  );

  useEffect(() => {
    void fetchVideos();
  }, [fetchVideos]);

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

    const trimmedSearch = searchInput.trim();

    if (trimmedSearch === appliedSearch && page === 1) {
      return;
    }

    setAppliedSearch(trimmedSearch);
    setSearchInput(trimmedSearch);
    setPage(1);
  }

  function handleClearSearch(): void {
    if (!searchInput && !appliedSearch) {
      return;
    }

    setSearchInput("");
    setAppliedSearch("");
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
  const trimmedSearchInput = searchInput.trim();
  const hasSearchInput = searchInput.length > 0;
  const hasAppliedSearch = appliedSearch.length > 0;
  const isSearchButtonDisabled =
    isLoading ||
    isRefetching ||
    (trimmedSearchInput === appliedSearch && page === 1);
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

        <form
          className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-md"
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
              onChange={(event) => setSearchInput(event.target.value)}
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
      </div>

      <div className="flex flex-col gap-3 text-sm text-(--admin-text) md:flex-row md:items-center md:justify-between">
        <span>
          Tổng cộng: {meta?.total ?? videos.length} videos
          {hasAppliedSearch ? ` · Tìm kiếm: "${appliedSearch}"` : ""}
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

      <CreateVideoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => void fetchVideos({ silent: true })}
      />
    </section>
  );
}
