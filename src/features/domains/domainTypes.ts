import type {
  DomainGroup,
  DomainGroupStatus,
  Website,
  WebsiteDomainGroup,
  WebsiteStatus,
} from "@/features/websites/websiteTypes";

export type { DomainGroup, DomainGroupStatus };

export type DomainStatus = "ACTIVE" | "DISABLED";
export type DomainUsageStatus = "AVAILABLE" | "IN_USE" | "DISABLED";

export type DomainPoolItem = {
  id: string;
  websiteId: string | null;
  websiteName: string | null;
  websiteSlug: string | null;
  domainGroup: WebsiteDomainGroup | null;
  domain: string;
  isPrimary: boolean;
  status: DomainStatus;
  usageStatus: DomainUsageStatus;
  createdAt: string;
  updatedAt: string;
};

export type DomainsListResponse = {
  items: DomainPoolItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

export type CreateDomainPayload = {
  domain: string;
  domainGroupKey?: string;
  domainGroupId?: string | null;
  status?: DomainStatus;
};

export type UpdateDomainPayload = Partial<CreateDomainPayload>;

export type AssignDomainPayload = {
  websiteId: string;
  replaceExisting?: boolean;
};

export type CreateDomainGroupPayload = {
  key: string;
  name: string;
  description?: string;
  status?: DomainGroupStatus;
};

export type UpdateDomainGroupPayload = Partial<CreateDomainGroupPayload>;

export type WebsiteOption = Pick<
  Website,
  "id" | "name" | "slug" | "domains"
> & {
  status?: WebsiteStatus;
};
