import { getLocalVideoThumbnailBlob } from "@/features/videos/videoApi";

const MAX_CACHED_THUMBNAILS = 150;
const THUMBNAIL_FAILURE_TTL_MS = 60_000;
const THUMBNAIL_REQUEST_CONCURRENCY = 4;

type ThumbnailRequest = {
  videoId: string;
  thumbnailUrl: string | null;
  updatedAt: string;
  checksumSha256?: string | null;
};

export type DashboardThumbnailLease = {
  objectUrl: string;
  release: () => void;
};

type ThumbnailEntry = {
  objectUrl: string;
  activeConsumers: number;
  lastAccessedAt: number;
  isCached: boolean;
  isPendingDelivery: boolean;
};

type QueueTask = {
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

const thumbnailEntries = new Map<string, ThumbnailEntry>();
const thumbnailFailures = new Map<string, number>();
const thumbnailRequests = new Map<string, Promise<boolean>>();
const requestQueue: QueueTask[] = [];

let activeRequestCount = 0;

export function getDashboardThumbnailCacheKey(
  request: ThumbnailRequest,
): string {
  const version =
    request.checksumSha256?.trim() || request.updatedAt || "unknown";

  return `${request.videoId}:${version}`;
}

function countCachedThumbnails(): number {
  let count = 0;

  for (const entry of thumbnailEntries.values()) {
    if (entry.isCached) {
      count += 1;
    }
  }

  return count;
}

function evictOldestUnusedCachedThumbnail(): boolean {
  let oldestKey: string | null = null;
  let oldestAccessedAt = Number.POSITIVE_INFINITY;

  for (const [key, entry] of thumbnailEntries) {
    if (
      entry.isCached &&
      entry.activeConsumers === 0 &&
      !entry.isPendingDelivery &&
      entry.lastAccessedAt < oldestAccessedAt
    ) {
      oldestKey = key;
      oldestAccessedAt = entry.lastAccessedAt;
    }
  }

  if (!oldestKey) {
    return false;
  }

  const entry = thumbnailEntries.get(oldestKey);

  if (entry) {
    URL.revokeObjectURL(entry.objectUrl);
    thumbnailEntries.delete(oldestKey);
  }

  return true;
}

function makeCacheRoom(): boolean {
  while (countCachedThumbnails() >= MAX_CACHED_THUMBNAILS) {
    if (!evictOldestUnusedCachedThumbnail()) {
      return false;
    }
  }

  return true;
}

function pruneFailureCache(): void {
  for (const [key, failedAt] of thumbnailFailures) {
    if (Date.now() - failedAt >= THUMBNAIL_FAILURE_TTL_MS) {
      thumbnailFailures.delete(key);
    }
  }

  while (thumbnailFailures.size > MAX_CACHED_THUMBNAILS) {
    const oldestKey = thumbnailFailures.keys().next().value as
      | string
      | undefined;

    if (!oldestKey) {
      return;
    }

    thumbnailFailures.delete(oldestKey);
  }
}

function runQueuedRequests(): void {
  while (
    activeRequestCount < THUMBNAIL_REQUEST_CONCURRENCY &&
    requestQueue.length > 0
  ) {
    const task = requestQueue.shift();

    if (!task) {
      return;
    }

    activeRequestCount += 1;

    void task
      .run()
      .then(task.resolve, task.reject)
      .finally(() => {
        activeRequestCount -= 1;
        runQueuedRequests();
      });
  }
}

function enqueueThumbnailRequest<T>(run: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    requestQueue.push({
      run,
      resolve: (value) => resolve(value as T),
      reject,
    });
    runQueuedRequests();
  });
}

function acquireExistingThumbnail(
  cacheKey: string,
): DashboardThumbnailLease | null {
  const entry = thumbnailEntries.get(cacheKey);

  if (!entry) {
    return null;
  }

  entry.activeConsumers += 1;
  entry.lastAccessedAt = Date.now();

  let isReleased = false;

  return {
    objectUrl: entry.objectUrl,
    release: () => {
      if (isReleased) {
        return;
      }

      isReleased = true;

      const currentEntry = thumbnailEntries.get(cacheKey);

      if (!currentEntry) {
        return;
      }

      currentEntry.activeConsumers = Math.max(
        0,
        currentEntry.activeConsumers - 1,
      );
      currentEntry.lastAccessedAt = Date.now();

      if (!currentEntry.isCached && currentEntry.activeConsumers === 0) {
        URL.revokeObjectURL(currentEntry.objectUrl);
        thumbnailEntries.delete(cacheKey);
      }
    },
  };
}

async function requestThumbnail(
  cacheKey: string,
  request: ThumbnailRequest,
): Promise<boolean> {
  try {
    const blob = await getLocalVideoThumbnailBlob({
      id: request.videoId,
      thumbnailUrl: request.thumbnailUrl,
    });
    const objectUrl = URL.createObjectURL(blob);
    const shouldCache = makeCacheRoom();

    thumbnailEntries.set(cacheKey, {
      objectUrl,
      activeConsumers: 0,
      lastAccessedAt: Date.now(),
      isCached: shouldCache,
      isPendingDelivery: true,
    });
    thumbnailFailures.delete(cacheKey);

    window.setTimeout(() => {
      const entry = thumbnailEntries.get(cacheKey);

      if (!entry) {
        return;
      }

      entry.isPendingDelivery = false;

      if (!entry.isCached && entry.activeConsumers === 0) {
        URL.revokeObjectURL(entry.objectUrl);
        thumbnailEntries.delete(cacheKey);
      }
    }, 0);

    return true;
  } catch {
    thumbnailFailures.set(cacheKey, Date.now());
    pruneFailureCache();
    return false;
  }
}

export async function acquireDashboardLocalThumbnail(
  request: ThumbnailRequest,
): Promise<DashboardThumbnailLease | null> {
  const cacheKey = getDashboardThumbnailCacheKey(request);
  const existingLease = acquireExistingThumbnail(cacheKey);

  if (existingLease) {
    return existingLease;
  }

  const failedAt = thumbnailFailures.get(cacheKey);

  if (
    failedAt !== undefined &&
    Date.now() - failedAt < THUMBNAIL_FAILURE_TTL_MS
  ) {
    return null;
  }

  if (failedAt !== undefined) {
    thumbnailFailures.delete(cacheKey);
  }

  let requestPromise = thumbnailRequests.get(cacheKey);

  if (!requestPromise) {
    requestPromise = enqueueThumbnailRequest(() =>
      requestThumbnail(cacheKey, request),
    );
    thumbnailRequests.set(cacheKey, requestPromise);
  }

  try {
    const wasLoaded = await requestPromise;
    return wasLoaded ? acquireExistingThumbnail(cacheKey) : null;
  } finally {
    if (thumbnailRequests.get(cacheKey) === requestPromise) {
      thumbnailRequests.delete(cacheKey);
    }
  }
}
