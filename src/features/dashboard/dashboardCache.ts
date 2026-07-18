import type {
  VideoStatus,
  VideosListResponse,
} from "@/features/videos/videoTypes";
import type { Website } from "@/features/websites/websiteTypes";

export const DASHBOARD_CACHE_STALE_TIME_MS = 60_000;

const MAX_VIDEO_PAGE_CACHE_ENTRIES = 100;

export type DashboardVideoCacheParams = {
  websiteId: string;
  page: number;
  limit: number;
  search?: string;
  filterKey?: string;
  status: VideoStatus;
  sortBy: "createdAt" | "updatedAt" | "publishedAt" | "title";
  sortOrder: "asc" | "desc";
  assignmentStatus: "ACTIVE";
  eligibleForShareLink: true;
};

type CacheEntry<T> = {
  data: T;
  cachedAt: number;
};

const activeWebsitesCache = new Map<string, CacheEntry<Website[]>>();
const activeWebsitesRequests = new Map<string, Promise<Website[]>>();
const videoPageCache = new Map<string, CacheEntry<VideosListResponse>>();
const videoPageRequests = new Map<string, Promise<VideosListResponse>>();

function isFresh(cachedAt: number): boolean {
  return Date.now() - cachedAt < DASHBOARD_CACHE_STALE_TIME_MS;
}

function getVideoPageCacheKey(
  scope: string,
  params: DashboardVideoCacheParams,
): string {
  return JSON.stringify({
    scope,
    websiteId: params.websiteId,
    page: params.page,
    limit: params.limit,
    search: normalizeVideoCacheSearch(params.search),
    filterKey: normalizeVideoCacheSearch(params.filterKey),
    status: params.status,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    assignmentStatus: params.assignmentStatus,
    eligibleForShareLink: params.eligibleForShareLink,
  });
}

export function invalidateDashboardWebsiteVideoCache(
  scope: string,
  websiteId: string,
): void {
  for (const cacheKey of videoPageCache.keys()) {
    const key = JSON.parse(cacheKey) as { scope?: string; websiteId?: string };
    if (key.scope === scope && key.websiteId === websiteId) {
      videoPageCache.delete(cacheKey);
    }
  }
}

export function invalidateAllDashboardVideoPageCache(): void {
  videoPageCache.clear();
}

function normalizeVideoCacheSearch(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function pruneVideoPageCache(): void {
  while (videoPageCache.size > MAX_VIDEO_PAGE_CACHE_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestCachedAt = Number.POSITIVE_INFINITY;

    for (const [key, entry] of videoPageCache) {
      if (entry.cachedAt < oldestCachedAt) {
        oldestKey = key;
        oldestCachedAt = entry.cachedAt;
      }
    }

    if (!oldestKey) {
      return;
    }

    videoPageCache.delete(oldestKey);
  }
}

export async function loadDashboardActiveWebsites(options: {
  scope: string;
  bypassCache?: boolean;
  fetcher: () => Promise<Website[]>;
}): Promise<Website[]> {
  const cachedEntry = activeWebsitesCache.get(options.scope);

  if (!options.bypassCache && cachedEntry && isFresh(cachedEntry.cachedAt)) {
    return cachedEntry.data;
  }

  if (!options.bypassCache) {
    const existingRequest = activeWebsitesRequests.get(options.scope);

    if (existingRequest) {
      return existingRequest;
    }
  }

  const request = options.fetcher().then((websites) => {
    if (activeWebsitesRequests.get(options.scope) === request) {
      activeWebsitesCache.set(options.scope, {
        data: websites,
        cachedAt: Date.now(),
      });
    }

    return websites;
  });

  activeWebsitesRequests.set(options.scope, request);

  try {
    return await request;
  } finally {
    if (activeWebsitesRequests.get(options.scope) === request) {
      activeWebsitesRequests.delete(options.scope);
    }
  }
}

export async function loadDashboardVideoPage(options: {
  scope: string;
  params: DashboardVideoCacheParams;
  bypassCache?: boolean;
  dedupeRequests?: boolean;
  fetcher: () => Promise<VideosListResponse>;
}): Promise<VideosListResponse> {
  const cacheKey = getVideoPageCacheKey(options.scope, options.params);
  const cachedEntry = videoPageCache.get(cacheKey);
  const shouldDedupeRequests = options.dedupeRequests ?? true;

  if (!options.bypassCache && cachedEntry && isFresh(cachedEntry.cachedAt)) {
    return cachedEntry.data;
  }

  if (!options.bypassCache && shouldDedupeRequests) {
    const existingRequest = videoPageRequests.get(cacheKey);

    if (existingRequest) {
      return existingRequest;
    }
  }

  const request = options.fetcher().then((response) => {
    if (!shouldDedupeRequests || videoPageRequests.get(cacheKey) === request) {
      videoPageCache.set(cacheKey, {
        data: response,
        cachedAt: Date.now(),
      });
      pruneVideoPageCache();
    }

    return response;
  });

  if (shouldDedupeRequests) {
    videoPageRequests.set(cacheKey, request);
  }

  try {
    return await request;
  } finally {
    if (shouldDedupeRequests && videoPageRequests.get(cacheKey) === request) {
      videoPageRequests.delete(cacheKey);
    }
  }
}
