import { CheckCircle2, Code2, Database, Link2, VideoIcon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  filterVideosBySource,
  getVideoSourceLabel,
  isDatabaseVideo,
  isEmbedVideo,
  isLinkVideo,
  isShareableVideo,
  type VideoSourceFilter,
} from "@/features/videos/videoSourceUtils";
import type { VideoAsset } from "@/features/videos/videoTypes";

type ReadyVideoPickerProps = {
  videos: VideoAsset[];
  selectedVideoIds: string[];
  onToggle: (videoId: string) => void;
  totalVideos?: number;
  searchQuery?: string;
};

type FilterTab = {
  value: VideoSourceFilter;
  label: string;
  count: number;
};

export function ReadyVideoPicker({
  videos,
  selectedVideoIds,
  onToggle,
  totalVideos,
  searchQuery,
}: ReadyVideoPickerProps) {
  const [sourceFilter, setSourceFilter] = useState<VideoSourceFilter>("all");
  const shareableVideos = useMemo(
    () => videos.filter(isShareableVideo),
    [videos],
  );
  const linkVideos = useMemo(
    () => shareableVideos.filter(isLinkVideo),
    [shareableVideos],
  );
  const embedVideos = useMemo(
    () => shareableVideos.filter(isEmbedVideo),
    [shareableVideos],
  );
  const databaseVideos = useMemo(
    () => shareableVideos.filter(isDatabaseVideo),
    [shareableVideos],
  );
  const filteredVideos = useMemo(
    () => filterVideosBySource(shareableVideos, sourceFilter),
    [shareableVideos, sourceFilter],
  );
  const filterTabs: FilterTab[] = [
    { value: "all", label: "All", count: shareableVideos.length },
    { value: "link", label: "Link video", count: linkVideos.length },
    { value: "embed", label: "Embed video", count: embedVideos.length },
    { value: "db-blob", label: "DB video", count: databaseVideos.length },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          aria-label="Filter videos by source"
          className="flex flex-wrap gap-2"
          role="tablist"
        >
          {filterTabs.map((tab) => {
            const isActive = sourceFilter === tab.value;

            return (
              <button
                key={tab.value}
                aria-pressed={isActive}
                className={[
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  isActive
                    ? "border-(--admin-primary) bg-(--admin-primary-soft) text-(--admin-primary)"
                    : "border-(--admin-border) bg-(--admin-surface-alt) text-(--admin-text) hover:border-(--admin-border-strong)",
                ].join(" ")}
                type="button"
                onClick={() => setSourceFilter(tab.value)}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        <p className="text-sm font-medium text-(--admin-text-strong)">
          Đã chọn: {selectedVideoIds.length} video
        </p>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-(--admin-border) p-4 text-sm text-(--admin-text)">
          {getEmptyStateText({
            searchQuery,
            shareableCount: shareableVideos.length,
            sourceFilter,
            titleFilteredCount: videos.length,
            totalVideos: totalVideos ?? videos.length,
          })}
        </div>
      ) : (
        <div className="max-h-105 overflow-y-auto pr-2 scrollbar-gutter-stable md:max-h-172.5 xl:max-h-140">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredVideos.map((video) => {
              const isDisabled = !isShareableVideo(video);
              const isSelected = selectedVideoIds.includes(video.id);
              const sourceLabel = getVideoSourceLabel(video);

              return (
                <label
                  key={video.id}
                  className={[
                    "group overflow-hidden rounded-lg border bg-(--admin-surface-alt) transition",
                    isSelected
                      ? "border-(--admin-primary)"
                      : "border-(--admin-border) hover:border-(--admin-border-strong)",
                    isDisabled
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer",
                  ].join(" ")}
                >
                  <div className="relative aspect-video bg-(--admin-surface)">
                    {video.thumbnailUrl ? (
                      <img
                        alt={video.title}
                        className="size-full object-cover"
                        decoding="async"
                        loading="lazy"
                        src={video.thumbnailUrl}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-(--admin-text-muted)">
                        <VideoIcon className="size-8" />
                      </div>
                    )}

                    <input
                      checked={isSelected}
                      className="sr-only"
                      disabled={isDisabled}
                      type="checkbox"
                      onChange={() => onToggle(video.id)}
                    />

                    {sourceLabel !== "Unknown" ? (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/72 px-2 py-1 text-xs font-semibold text-white">
                        {sourceLabel === "Embed" ? (
                          <Code2 className="size-3" />
                        ) : sourceLabel === "Database" ? (
                          <Database className="size-3" />
                        ) : (
                          <Link2 className="size-3" />
                        )}
                        {sourceLabel}
                      </span>
                    ) : null}

                    {isSelected ? (
                      <span className="absolute right-2 top-2 rounded-full bg-(--admin-primary) p-1 text-white">
                        <CheckCircle2 className="size-4" />
                      </span>
                    ) : null}
                  </div>

                  <div className="p-3">
                    <p className="line-clamp-2 min-h-10 text-sm font-semibold text-(--admin-text-strong)">
                      {video.title}
                    </p>
                    <p className="mt-2 truncate font-mono text-xs text-(--admin-text-muted)">
                      {video.id}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getEmptyStateText(params: {
  searchQuery?: string;
  totalVideos: number;
  titleFilteredCount: number;
  shareableCount: number;
  sourceFilter: VideoSourceFilter;
}): string {
  if (params.totalVideos === 0) {
    return "Chưa có video READY nào.";
  }

  if (params.searchQuery && params.titleFilteredCount === 0) {
    return `Không tìm thấy video phù hợp với từ khóa "${params.searchQuery}".`;
  }

  if (params.sourceFilter === "link") {
    return "Chưa có link video READY nào.";
  }

  if (params.sourceFilter === "embed") {
    return "Chưa có embed video READY nào.";
  }

  if (params.sourceFilter === "db-blob") {
    return "Chưa có database video READY nào.";
  }

  if (params.shareableCount === 0) {
    return "Chưa có video READY có thể chia sẻ.";
  }

  return "Không có video phù hợp với bộ lọc hiện tại.";
}
