import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildWebsiteVideosQueryParams } from "../src/features/websites/websiteVideoQuery";

describe("website-scoped video query contract", () => {
  it("passes through the dashboard share-link scope parameters", () => {
    const params = buildWebsiteVideosQueryParams({
      page: 1,
      limit: 24,
      search: "abc",
      filterKey: "sml",
      status: "READY",
      sortBy: "createdAt",
      sortOrder: "desc",
      assignmentStatus: "ACTIVE",
      eligibleForShareLink: true,
    });

    assert.deepEqual(params, {
      page: 1,
      limit: 24,
      search: "abc",
      filterKey: "sml",
      status: "READY",
      provider: undefined,
      sourceType: undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
      assignmentStatus: "ACTIVE",
      eligibleForShareLink: true,
    });
  });

  it("drops empty search and filterKey instead of sending empty strings", () => {
    const params = buildWebsiteVideosQueryParams({
      page: 2,
      limit: 24,
      search: "   ",
      filterKey: "",
    });

    assert.equal(params.search, undefined);
    assert.equal(params.filterKey, undefined);
    assert.equal(params.page, 2);
  });

  it("trims search text so pagination pages share one canonical query", () => {
    const first = buildWebsiteVideosQueryParams({
      page: 1,
      limit: 24,
      search: " abc ",
    });
    const second = buildWebsiteVideosQueryParams({
      page: 2,
      limit: 24,
      search: "abc",
    });

    assert.equal(first.search, second.search);
  });
});
