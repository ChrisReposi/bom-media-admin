import type { VideoAsset } from "@/features/videos/videoTypes";

export type WebsiteStatus = "ACTIVE" | "DISABLED";
export type DomainStatus = "ACTIVE" | "DISABLED";
export type ShareLinkStatus = "ACTIVE" | "REVOKED" | "EXPIRED" | "DISABLED";

export type DomainGroupStatus = "ACTIVE" | "DISABLED";

export type WebsiteDomainGroup = {
  id: string;
  key: string;
  name: string;
  status?: DomainGroupStatus;
};

export type DomainGroup = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: DomainGroupStatus;
  createdAt: string;
  updatedAt: string;
};

export type DomainGroupsListResponse = {
  items: DomainGroup[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type WebsiteDomain = {
  id: string;
  websiteId: string;
  domain: string;
  isPrimary: boolean;
  status: DomainStatus;
  createdAt: string;
  updatedAt: string;
};

export type Website = {
  id: string;
  name: string;
  slug: string;
  defaultTitle: string | null;
  defaultDescription: string | null;
  domainGroup: WebsiteDomainGroup | null;
  status: WebsiteStatus;
  domains: WebsiteDomain[];
  createdAt: string;
  updatedAt: string;
};

export type WebsitesListResponse = {
  items: Website[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateWebsitePayload = {
  name: string;
  slug: string;
  defaultTitle?: string;
  defaultDescription?: string;
  domainGroupKey?: string;
  domainGroupId?: string | null;
};

export type UpdateWebsitePayload = Partial<CreateWebsitePayload> & {
  status?: WebsiteStatus;
};

export type CreateWebsiteDomainPayload = {
  domain: string;
  isPrimary?: boolean;
};

export type UpdateWebsiteDomainPayload = {
  domain?: string;
  isPrimary?: boolean;
  status?: DomainStatus;
};

export type ActivateWebsiteDomainPayload = {
  isPrimary?: boolean;
};

export type ClaimCurrentWebsiteDomainPayload = {
  host: string;
  isPrimary?: boolean;
};

export type AssignWebsiteVideosPayload = {
  videoIds: string[];
  featuredVideoId?: string;
};

export type AssignmentStatus = "ACTIVE" | "DISABLED";

export type WebsiteVideoAssignment = {
  id: string;
  websiteId: string;
  videoId: string;
  sortOrder: number;
  isFeatured: boolean;
  status: AssignmentStatus;
  videoTitle: string;
  videoStatus: VideoAsset["status"];
  thumbnailUrl: string | null;
  playbackUrl: string | null;
  video: VideoAsset;
};

export type WebsiteVideosListResponse = {
  items: WebsiteVideoAssignment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeAssignmentTotal: number;
    eligibleAssignmentTotal: number;
  };
};

export type CreateShareLinkPayload = {
  label?: string;
  videoIds?: string[];
  expiresAt?: string;
  maxViews?: number;
};

export type ShareLinkVideo = {
  id: string;
  videoId: string;
  title: string;
  sortOrder: number;
};

export type ShareLink = {
  id: string;
  websiteId: string;
  label: string | null;
  status: ShareLinkStatus;
  expiresAt: string | null;
  maxViews: number | null;
  currentViews: number;
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
  publicUrl: string | null;
  videos: ShareLinkVideo[];
};

export type ShareLinksListResponse = {
  items: ShareLink[];
};

export type CreateShareLinkResponse = {
  message: string;
  shareLink: ShareLink;
  rawToken: string;
  publicUrl: string | null;
};

export type WebsiteVideoOption = Pick<
  VideoAsset,
  "id" | "title" | "status" | "playbackUrl"
>;
