export type WebsiteVideosQuery = {
  page: number;
  limit: number;
  search?: string;
  filterKey?: string;
  status?: string;
  provider?: string;
  sourceType?: string;
  sortBy?: "sortOrder" | "createdAt" | "updatedAt" | "publishedAt" | "title";
  sortOrder?: "asc" | "desc";
  assignmentStatus?: "ACTIVE" | "DISABLED";
  eligibleForShareLink?: boolean;
};

export function buildWebsiteVideosQueryParams(params: WebsiteVideosQuery) {
  return {
    page: params.page,
    limit: params.limit,
    search: params.search?.trim() || undefined,
    filterKey: params.filterKey?.trim() || undefined,
    status: params.status,
    provider: params.provider,
    sourceType: params.sourceType,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    assignmentStatus: params.assignmentStatus,
    eligibleForShareLink: params.eligibleForShareLink,
  };
}
