import { Link2, Loader2, Search, X } from "lucide-react";
import type { FormEvent, KeyboardEvent } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VideoAsset } from "@/features/videos/videoTypes";
import type { Website } from "@/features/websites/websiteTypes";
import type { ShareLinkComposerPayload } from "../dashboardTypes";
import { ReadyVideoPicker } from "./ReadyVideoPicker";
import { WebsiteQuickSelect } from "./WebsiteQuickSelect";

type ShareLinkComposerProps = {
  websites: Website[];
  videos: VideoAsset[];
  selectedWebsiteId: string;
  selectedVideoIds: string[];
  isSubmitting: boolean;
  onWebsiteChange: (websiteId: string) => void;
  onVideoToggle: (videoId: string) => void;
  onSubmit: (payload: ShareLinkComposerPayload) => Promise<void>;
};

const adminInputClass = [
  "h-10 border shadow-sm transition-colors text-sm font-normal",
  "border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong) placeholder:text-(--admin-text-muted)",
  "hover:border-(--admin-border-strong) hover:bg-(--admin-surface-alt)",
  "focus-visible:ring-2 focus-visible:ring-(--admin-primary)",
].join(" ");

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function preventSearchEnterSubmit(
  event: KeyboardEvent<HTMLInputElement>,
): void {
  if (event.key === "Enter") {
    event.preventDefault();
  }
}

export function ShareLinkComposer({
  websites,
  videos,
  selectedWebsiteId,
  selectedVideoIds,
  isSubmitting,
  onWebsiteChange,
  onVideoToggle,
  onSubmit,
}: ShareLinkComposerProps) {
  const [label, setLabel] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [websiteSearch, setWebsiteSearch] = useState("");
  const [videoSearch, setVideoSearch] = useState("");
  const filteredWebsites = useMemo(() => {
    const keyword = normalizeSearchText(websiteSearch);

    if (!keyword) {
      return websites;
    }

    return websites.filter((website) =>
      website.name.toLowerCase().includes(keyword),
    );
  }, [websiteSearch, websites]);
  const filteredVideos = useMemo(() => {
    const keyword = normalizeSearchText(videoSearch);

    if (!keyword) {
      return videos;
    }

    return videos.filter((video) =>
      video.title.toLowerCase().includes(keyword),
    );
  }, [videoSearch, videos]);
  const selectedVideoCount = selectedVideoIds.length;
  const totalWebsiteCount = websites.length;
  const totalVideoCount = videos.length;
  const filteredWebsiteCount = filteredWebsites.length;
  const filteredVideoCount = filteredVideos.length;
  const websiteSearchQuery = websiteSearch.trim();
  const videoSearchQuery = videoSearch.trim();
  const isSelectedWebsiteHidden =
    websiteSearchQuery.length > 0 &&
    Boolean(selectedWebsiteId) &&
    !filteredWebsites.some((website) => website.id === selectedWebsiteId);
  const canSubmit =
    !isSubmitting && Boolean(selectedWebsiteId) && selectedVideoCount > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await onSubmit({
      ...(label.trim() ? { label: label.trim() } : {}),
      ...(parsePositiveInteger(maxViews) !== undefined
        ? { maxViews: parsePositiveInteger(maxViews) }
        : {}),
      ...(dateTimeLocalToIso(expiresAt)
        ? { expiresAt: dateTimeLocalToIso(expiresAt) }
        : {}),
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm xl:col-span-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-(--admin-text-strong)">
                Chọn website
              </h2>
              <p className="text-left text-sm text-(--admin-text-muted)">
                {websiteSearchQuery
                  ? `${filteredWebsiteCount}/${totalWebsiteCount} websites`
                  : `${totalWebsiteCount} websites`}
              </p>
            </div>

            <div className="relative w-full max-w-[50%]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--admin-text-muted)" />
              <Input
                aria-label="Tìm website theo tên"
                className={[adminInputClass, "pl-9 pr-9"].join(" ")}
                placeholder="Tìm website..."
                value={websiteSearch}
                onChange={(event) => setWebsiteSearch(event.target.value)}
                onKeyDown={preventSearchEnterSubmit}
              />
              {websiteSearch ? (
                <button
                  aria-label="Xóa tìm kiếm website"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-(--admin-text-muted) transition hover:bg-(--admin-surface-alt) hover:text-(--admin-text-strong)"
                  type="button"
                  onClick={() => setWebsiteSearch("")}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <WebsiteQuickSelect
            selectedWebsiteId={selectedWebsiteId}
            searchQuery={websiteSearchQuery}
            totalWebsites={totalWebsiteCount}
            websites={filteredWebsites}
            onChange={onWebsiteChange}
          />

          {isSelectedWebsiteHidden ? (
            <p className="mt-3 text-sm text-(--admin-text-muted)">
              Website đang chọn đang bị ẩn bởi bộ lọc tìm kiếm.
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-(--admin-text-strong)">
                Chọn video
              </h2>
              <p className="text-left text-sm text-(--admin-text-muted)">
                {videoSearchQuery
                  ? `${filteredVideoCount}/${totalVideoCount} videos`
                  : `${totalVideoCount} videos`}
              </p>
            </div>

            <div className="relative w-full max-w-[50%]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--admin-text-muted)" />
              <Input
                aria-label="Tìm video theo tiêu đề"
                className={[adminInputClass, "pl-9 pr-9"].join(" ")}
                placeholder="Tìm video..."
                value={videoSearch}
                onChange={(event) => setVideoSearch(event.target.value)}
                onKeyDown={preventSearchEnterSubmit}
              />
              {videoSearch ? (
                <button
                  aria-label="Xóa tìm kiếm video"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-(--admin-text-muted) transition hover:bg-(--admin-surface-alt) hover:text-(--admin-text-strong)"
                  type="button"
                  onClick={() => setVideoSearch("")}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <ReadyVideoPicker
            searchQuery={videoSearchQuery}
            selectedVideoIds={selectedVideoIds}
            totalVideos={totalVideoCount}
            videos={filteredVideos}
            onToggle={onVideoToggle}
          />
        </section>
      </div>

      <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Link2 className="size-4 text-(--admin-primary)" />
          <h2 className="text-lg font-semibold text-(--admin-text-strong)">
            Tùy chọn share link
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-(--admin-text-strong)">
            <span className="mb-2 block">Label</span>
            <Input
              id="labelInput"
              className={adminInputClass}
              placeholder="Send to customer A"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-(--admin-text-strong)">
            <span className="mb-2 block">Max views</span>
            <Input
              id="maxViewsInput"
              className={adminInputClass}
              min={1}
              type="number"
              value={maxViews}
              onChange={(event) => setMaxViews(event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-(--admin-text-strong)">
            <span className="mb-2 block">Expires at</span>
            <Input
              id="expiresAtInput"
              className={adminInputClass}
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </label>
        </div>

        {selectedVideoCount === 0 ? (
          <p className="mt-3 text-sm text-(--admin-text-muted)">
            Vui lòng chọn ít nhất một video để tạo share link.
          </p>
        ) : null}

        <Button className="mt-4" disabled={!canSubmit} type="submit">
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4" />
          )}
          Tạo share link
        </Button>
      </section>
    </form>
  );
}

function parsePositiveInteger(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function dateTimeLocalToIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
