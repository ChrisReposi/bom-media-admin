import { Loader2, Search, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getVideos } from "@/features/videos/videoApi";
import { isShareableVideo } from "@/features/videos/videoSourceUtils";
import type { VideoAsset } from "@/features/videos/videoTypes";
import { getWebsiteApiErrorMessage } from "@/features/websites/websiteApi";
import { isApiRequestCanceled } from "@/lib/api/apiError";

const ASSIGNMENT_PAGE_SIZE = 24;

type AssignWebsiteVideoDialogProps = {
  open: boolean;
  websiteName: string;
  assignedVideoIds: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onAssign: (videoId: string) => Promise<void>;
};

export function AssignWebsiteVideoDialog({
  open,
  websiteName,
  assignedVideoIds,
  isSubmitting,
  onClose,
  onAssign,
}: AssignWebsiteVideoDialogProps) {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const assignedVideoIdSet = useMemo(
    () => new Set(assignedVideoIds),
    [assignedVideoIds],
  );

  useEffect(() => {
    if (!open) {
      requestVersionRef.current += 1;
      abortRef.current?.abort();
      return;
    }

    setSearch("");
    setAppliedSearch("");
    setSelectedVideoId("");
    setVideos([]);
    void loadPage(1, "", false);

    return () => {
      requestVersionRef.current += 1;
      abortRef.current?.abort();
    };
  }, [open]);

  async function loadPage(
    nextPage: number,
    query: string,
    append: boolean,
  ): Promise<void> {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    append ? setIsLoadingMore(true) : setIsLoading(true);
    setError(null);

    try {
      const response = await getVideos(
        {
          page: nextPage,
          limit: ASSIGNMENT_PAGE_SIZE,
          search: query || undefined,
          status: "READY",
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        { signal: controller.signal },
      );
      if (requestVersionRef.current !== requestVersion) return;

      const eligibleVideos = response.items.filter(isShareableVideo);
      setVideos((current) =>
        append ? mergeVideoOptions(current, eligibleVideos) : eligibleVideos,
      );
      setPage(response.meta.page);
      setTotalPages(response.meta.totalPages);
    } catch (loadError) {
      if (!isApiRequestCanceled(loadError)) {
        setError(getWebsiteApiErrorMessage(loadError));
      }
    } finally {
      if (requestVersionRef.current === requestVersion) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const normalized = search.trim().replace(/\s+/g, " ").slice(0, 80);
    setAppliedSearch(normalized);
    setSelectedVideoId("");
    void loadPage(1, normalized, false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        aria-modal="true"
        className="w-full max-w-3xl rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-xl"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-(--admin-text-strong)">
              Gán video cho website
            </h2>
            <p className="mt-1 text-sm text-(--admin-text-muted)">
              Website: {websiteName}. Thao tác này là chủ đích và không tự tạo
              share link.
            </p>
          </div>
          <Button
            aria-label="Đóng"
            disabled={isSubmitting}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <form className="mb-4 flex gap-2" onSubmit={handleSearch}>
          <Input
            aria-label="Tìm video để gán"
            id="assign-website-video-search"
            maxLength={80}
            name="assignWebsiteVideoSearch"
            placeholder="Tìm video READY theo tiêu đề..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button disabled={isLoading || isSubmitting} type="submit">
            <Search className="size-4" />
            Tìm
          </Button>
        </form>

        {error ? (
          <div className="mb-3 rounded-lg bg-(--admin-danger-soft) p-3 text-sm text-(--admin-danger)">
            {error}
          </div>
        ) : null}

        <div className="max-h-96 space-y-2 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-(--admin-text-muted)">
              <Loader2 className="size-4 animate-spin" /> Đang tải video...
            </div>
          ) : videos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-(--admin-border) p-4 text-sm text-(--admin-text-muted)">
              {appliedSearch
                ? "Không có video READY/playable khớp tìm kiếm."
                : "Không có video READY/playable để gán."}
            </div>
          ) : (
            videos.map((video) => {
              const alreadyAssigned = assignedVideoIdSet.has(video.id);
              return (
                <label
                  className="flex items-center gap-3 rounded-lg border border-(--admin-border) p-3"
                  key={video.id}
                >
                  <input
                    checked={selectedVideoId === video.id}
                    disabled={alreadyAssigned || isSubmitting}
                    name="website-video-assignment"
                    type="radio"
                    onChange={() => setSelectedVideoId(video.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-(--admin-text-strong)">
                      {video.title}
                    </span>
                    <span className="block truncate font-mono text-xs text-(--admin-text-muted)">
                      {video.id}
                    </span>
                  </span>
                  {alreadyAssigned ? (
                    <span className="text-xs text-(--admin-text-muted)">
                      Đã gán
                    </span>
                  ) : null}
                </label>
              );
            })
          )}
        </div>

        {page < totalPages ? (
          <Button
            className="mt-3"
            disabled={isLoadingMore || isSubmitting}
            type="button"
            variant="outline"
            onClick={() => void loadPage(page + 1, appliedSearch, true)}
          >
            {isLoadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
            Tải thêm
          </Button>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            disabled={isSubmitting}
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            disabled={!selectedVideoId || isSubmitting}
            type="button"
            onClick={() => void onAssign(selectedVideoId)}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isSubmitting ? "Đang gán..." : "Xác nhận gán video"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function mergeVideoOptions(
  currentVideos: VideoAsset[],
  nextVideos: VideoAsset[],
): VideoAsset[] {
  const byId = new Map(currentVideos.map((video) => [video.id, video]));
  for (const video of nextVideos) byId.set(video.id, video);
  return Array.from(byId.values());
}
