import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  deleteVideo,
  getApiErrorMessage,
  getVideos,
} from "@/features/videos/videoApi";
import {
  VIDEO_STATUS_OPTIONS,
  type VideoAsset,
  type VideoStatus,
  type VideosListResponse,
} from "@/features/videos/videoTypes";

const DEFAULT_VIDEO_STATUS_FILTER: VideoStatus = "READY";

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
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

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

  async function handleDelete(video: VideoAsset): Promise<void> {
    setDeletingVideoId(video.id);

    try {
      await deleteVideo(video.id);
      toast.success("Đã tắt video.");
      await fetchVideos({ silent: true });
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError));
    } finally {
      setDeletingVideoId(null);
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
              isDeleting={deletingVideoId === video.id}
              onDelete={(selectedVideo) => void handleDelete(selectedVideo)}
              onOpen={(selectedVideo) =>
                navigate(`/videos/${selectedVideo.id}`)
              }
            />
          ))}
        </div>
      )}

      <CreateVideoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => void fetchVideos({ silent: true })}
      />
    </section>
  );
}
