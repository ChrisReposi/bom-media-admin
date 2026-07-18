import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  invalidateDashboardWebsiteVideoCache,
  loadDashboardVideoPage,
  type DashboardVideoCacheParams,
} from "../src/features/dashboard/dashboardCache";
import {
  getWebsiteVideoEmptyStateText,
  isCurrentWebsiteVideoResponse,
  isWebsiteVideoAssignmentError,
  reconcileAssignmentErrorSelection,
} from "../src/features/dashboard/dashboardAssignmentPolicy";
import type { VideosListResponse } from "../src/features/videos/videoTypes";
import { createSubmissionGate } from "../src/features/dashboard/dashboardSubmissionGate";
import { buildWebsiteVideosQueryParams } from "../src/features/websites/websiteVideoQuery";

function params(websiteId: string): DashboardVideoCacheParams {
  return {
    websiteId,
    page: 1,
    limit: 24,
    status: "READY",
    sortBy: "createdAt",
    sortOrder: "desc",
    assignmentStatus: "ACTIVE",
    eligibleForShareLink: true,
  };
}

function response(total: number): VideosListResponse {
  return {
    items: [],
    meta: { page: 1, limit: 24, total, totalPages: total > 0 ? 1 : 0 },
  };
}

function assignmentError(invalidVideoIds?: string[]): unknown {
  return {
    isAxiosError: true,
    name: "AxiosError",
    message: "request failed",
    config: {},
    response: {
      status: 400,
      data: {
        code: "VIDEO_NOT_ACTIVE_FOR_WEBSITE",
        message: "One or more videos are not actively assigned.",
        ...(invalidVideoIds ? { details: { invalidVideoIds } } : {}),
      },
      headers: {},
      config: {},
      statusText: "Bad Request",
    },
    toJSON: () => ({}),
  };
}

describe("dashboard website-scoped video policy", () => {
  it("uses a distinct cache entry for the same query on different websites", async () => {
    let websiteAFetches = 0;
    let websiteBFetches = 0;
    const scope = `scope-${Date.now()}-separate`;

    await loadDashboardVideoPage({
      scope,
      params: params("website-a"),
      fetcher: async () => {
        websiteAFetches += 1;
        return response(1);
      },
    });
    await loadDashboardVideoPage({
      scope,
      params: params("website-a"),
      fetcher: async () => {
        websiteAFetches += 1;
        return response(2);
      },
    });
    await loadDashboardVideoPage({
      scope,
      params: params("website-b"),
      fetcher: async () => {
        websiteBFetches += 1;
        return response(3);
      },
    });

    assert.equal(websiteAFetches, 1);
    assert.equal(websiteBFetches, 1);
  });

  it("invalidates only the mutated website cache", async () => {
    let websiteAFetches = 0;
    let websiteBFetches = 0;
    const scope = `scope-${Date.now()}-invalidate`;
    const loadA = () =>
      loadDashboardVideoPage({
        scope,
        params: params("website-a"),
        fetcher: async () => {
          websiteAFetches += 1;
          return response(1);
        },
      });
    const loadB = () =>
      loadDashboardVideoPage({
        scope,
        params: params("website-b"),
        fetcher: async () => {
          websiteBFetches += 1;
          return response(1);
        },
      });

    await Promise.all([loadA(), loadB()]);
    invalidateDashboardWebsiteVideoCache(scope, "website-a");
    await Promise.all([loadA(), loadB()]);

    assert.equal(websiteAFetches, 2);
    assert.equal(websiteBFetches, 1);
  });

  it("ignores a response for an old website or dataset version", () => {
    assert.equal(
      isCurrentWebsiteVideoResponse({
        requestVersion: 4,
        currentVersion: 5,
        requestWebsiteId: "website-a",
        currentWebsiteId: "website-b",
      }),
      false,
    );
    assert.equal(
      isCurrentWebsiteVideoResponse({
        requestVersion: 5,
        currentVersion: 5,
        requestWebsiteId: "website-b",
        currentWebsiteId: "website-b",
      }),
      true,
    );
  });

  it("maps the stable code and removes every invalid selected ID", () => {
    const error = assignmentError(["video-b", "video-c"]);

    assert.equal(isWebsiteVideoAssignmentError(error), true);
    assert.deepEqual(
      reconcileAssignmentErrorSelection(
        ["video-a", "video-b", "video-c"],
        error,
      ),
      ["video-a"],
    );
    assert.deepEqual(
      reconcileAssignmentErrorSelection(["video-a"], assignmentError()),
      [],
    );
  });

  it("prevents duplicate assignment or share-link submissions", () => {
    const gate = createSubmissionGate();
    assert.equal(gate.tryAcquire(), true);
    assert.equal(gate.tryAcquire(), false);
    gate.release();
    assert.equal(gate.tryAcquire(), true);
  });

  it("does not leak the cache-only websiteId into validated query params", () => {
    const query = buildWebsiteVideosQueryParams(params("website-a"));
    assert.equal("websiteId" in query, false);
    assert.equal(query.eligibleForShareLink, true);
  });

  it("distinguishes no website, no assignments, and assigned-but-ineligible", () => {
    const base = {
      totalVideos: 0,
      titleFilteredCount: 0,
      shareableCount: 0,
      sourceFilter: "all" as const,
      activeAssignmentTotal: 0,
      eligibleAssignmentTotal: 0,
    };
    assert.match(
      getWebsiteVideoEmptyStateText({ ...base, hasSelectedWebsite: false }),
      /chọn website/,
    );
    assert.match(
      getWebsiteVideoEmptyStateText({ ...base, hasSelectedWebsite: true }),
      /chưa có video được gán/,
    );
    assert.match(
      getWebsiteVideoEmptyStateText({
        ...base,
        hasSelectedWebsite: true,
        activeAssignmentTotal: 2,
      }),
      /chưa có video READY\/playable/,
    );
  });
});
