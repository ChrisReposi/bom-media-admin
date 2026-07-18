import { axiosClient } from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/api/apiError";
import { invalidateAllDashboardVideoPageCache } from "@/features/dashboard/dashboardCache";
import { normalizePublicShareUrl } from "./shareLinkUrlUtils";
import {
  buildWebsiteVideosQueryParams,
  type WebsiteVideosQuery,
} from "./websiteVideoQuery";

import type {
  ActivateWebsiteDomainPayload,
  AssignWebsiteVideosPayload,
  ClaimCurrentWebsiteDomainPayload,
  CreateShareLinkPayload,
  CanonicalShareLinkResponse,
  CreateShareLinkResponse,
  CreateWebsiteDomainPayload,
  CreateWebsitePayload,
  DomainGroupsListResponse,
  DomainGroupStatus,
  ShareLink,
  ShareLinksListResponse,
  UpdateWebsiteDomainPayload,
  UpdateWebsitePayload,
  Website,
  WebsiteDomain,
  WebsiteVideoAssignment,
  WebsiteVideosListResponse,
  WebsitesListResponse,
} from "./websiteTypes";

export function getWebsiteApiErrorMessage(error: unknown): string {
  return getApiErrorMessage(error);
}

export async function getDomainGroups(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: DomainGroupStatus;
}): Promise<DomainGroupsListResponse> {
  const response = await axiosClient.get<DomainGroupsListResponse>(
    "/admin/domain-groups",
    {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search?.trim() || undefined,
        status: params?.status,
      },
    },
  );

  return response.data;
}

export async function getWebsites(params?: {
  page?: number;
  limit?: number;
  search?: string;
  domain?: string;
  domainGroupKey?: string;
  status?: string;
}): Promise<WebsitesListResponse> {
  const response = await axiosClient.get<WebsitesListResponse>(
    "/admin/websites",
    {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search?.trim() || undefined,
        domain: params?.domain?.trim() || undefined,
        domainGroupKey: params?.domainGroupKey?.trim() || undefined,
        status: params?.status,
      },
    },
  );

  return response.data;
}

export async function getWebsiteById(id: string): Promise<Website> {
  const response = await axiosClient.get<Website>(`/admin/websites/${id}`);

  return response.data;
}

function normalizeCreateShareLinkResponse(
  data: CreateShareLinkResponse,
): CreateShareLinkResponse {
  const publicUrl =
    normalizePublicShareUrl(data.publicUrl) ??
    normalizePublicShareUrl(data.shareLink.publicUrl);

  return {
    ...data,
    publicUrl,
    shareLink: {
      ...data.shareLink,
      publicUrl: normalizePublicShareUrl(data.shareLink.publicUrl) ?? publicUrl,
    },
  };
}

function normalizeShareLinkResponse(shareLink: ShareLink): ShareLink {
  return {
    ...shareLink,
    publicUrl: normalizePublicShareUrl(shareLink.publicUrl),
  };
}

export async function createWebsite(
  payload: CreateWebsitePayload,
): Promise<Website> {
  const response = await axiosClient.post<Website>("/admin/websites", {
    name: payload.name.trim(),
    slug: payload.slug.trim(),
    ...(payload.defaultTitle?.trim()
      ? { defaultTitle: payload.defaultTitle.trim() }
      : {}),
    ...(payload.defaultDescription?.trim()
      ? { defaultDescription: payload.defaultDescription.trim() }
      : {}),
    ...(payload.domainGroupKey?.trim()
      ? { domainGroupKey: payload.domainGroupKey.trim().toLowerCase() }
      : {}),
    ...(payload.domainGroupId === null
      ? { domainGroupId: null }
      : payload.domainGroupId?.trim()
        ? { domainGroupId: payload.domainGroupId.trim() }
        : {}),
  });

  return response.data;
}

export async function updateWebsite(
  id: string,
  payload: UpdateWebsitePayload,
): Promise<Website> {
  const response = await axiosClient.patch<Website>(`/admin/websites/${id}`, {
    ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
    ...(payload.slug?.trim() ? { slug: payload.slug.trim() } : {}),
    ...(payload.defaultTitle !== undefined
      ? payload.defaultTitle?.trim()
        ? { defaultTitle: payload.defaultTitle.trim() }
        : {}
      : {}),
    ...(payload.defaultDescription !== undefined
      ? payload.defaultDescription?.trim()
        ? { defaultDescription: payload.defaultDescription.trim() }
        : {}
      : {}),
    ...(payload.domainGroupKey?.trim()
      ? { domainGroupKey: payload.domainGroupKey.trim().toLowerCase() }
      : {}),
    ...(payload.domainGroupId === null
      ? { domainGroupId: null }
      : payload.domainGroupId?.trim()
        ? { domainGroupId: payload.domainGroupId.trim() }
        : {}),
    ...(payload.status ? { status: payload.status } : {}),
  });

  return response.data;
}

export async function disableWebsite(id: string): Promise<{ message: string }> {
  const response = await axiosClient.delete<{ message: string }>(
    `/admin/websites/${id}`,
  );

  return response.data;
}

export async function createWebsiteDomain(
  websiteId: string,
  payload: CreateWebsiteDomainPayload,
): Promise<WebsiteDomain> {
  const response = await axiosClient.post<WebsiteDomain>(
    `/admin/websites/${websiteId}/domains`,
    {
      domain: payload.domain.trim(),
      ...(payload.isPrimary !== undefined
        ? { isPrimary: payload.isPrimary }
        : {}),
    },
  );

  return response.data;
}

export async function updateWebsiteDomain(
  websiteId: string,
  domainId: string,
  payload: UpdateWebsiteDomainPayload,
): Promise<WebsiteDomain> {
  const response = await axiosClient.patch<WebsiteDomain>(
    `/admin/websites/${websiteId}/domains/${domainId}`,
    {
      ...(payload.domain?.trim() ? { domain: payload.domain.trim() } : {}),
      ...(payload.isPrimary !== undefined
        ? { isPrimary: payload.isPrimary }
        : {}),
      ...(payload.status ? { status: payload.status } : {}),
    },
  );

  return response.data;
}

export async function disableWebsiteDomain(
  websiteId: string,
  domainId: string,
): Promise<WebsiteDomain> {
  const response = await axiosClient.post<WebsiteDomain>(
    `/admin/websites/${websiteId}/domains/${domainId}/disable`,
  );

  return response.data;
}

export async function activateWebsiteDomain(
  websiteId: string,
  domainId: string,
  payload?: ActivateWebsiteDomainPayload,
): Promise<WebsiteDomain> {
  const response = await axiosClient.post<WebsiteDomain>(
    `/admin/websites/${websiteId}/domains/${domainId}/activate`,
    {
      ...(payload?.isPrimary !== undefined
        ? { isPrimary: payload.isPrimary }
        : {}),
    },
  );

  return response.data;
}

export async function claimCurrentWebsiteDomain(
  websiteId: string,
  payload: ClaimCurrentWebsiteDomainPayload,
): Promise<WebsiteDomain> {
  const response = await axiosClient.post<WebsiteDomain>(
    `/admin/websites/${websiteId}/domains/claim-current`,
    {
      host: payload.host.trim(),
      ...(payload.isPrimary !== undefined
        ? { isPrimary: payload.isPrimary }
        : {}),
    },
  );

  return response.data;
}

export async function assignWebsiteVideos(
  websiteId: string,
  payload: AssignWebsiteVideosPayload,
): Promise<unknown> {
  const response = await axiosClient.put(
    `/admin/websites/${websiteId}/videos`,
    payload,
  );

  invalidateAllDashboardVideoPageCache();

  return response.data;
}

export async function getWebsiteVideos(
  websiteId: string,
  params: WebsiteVideosQuery,
  options?: { signal?: AbortSignal },
): Promise<WebsiteVideosListResponse> {
  const response = await axiosClient.get<WebsiteVideosListResponse>(
    `/admin/websites/${websiteId}/videos`,
    {
      params: buildWebsiteVideosQueryParams(params),
      signal: options?.signal,
    },
  );

  return response.data;
}

export async function assignSingleWebsiteVideo(
  websiteId: string,
  videoId: string,
): Promise<WebsiteVideoAssignment> {
  const response = await axiosClient.post<WebsiteVideoAssignment>(
    `/admin/websites/${websiteId}/videos/assign`,
    { videoId: videoId.trim() },
  );

  return response.data;
}

export async function createShareLink(
  websiteId: string,
  payload: CreateShareLinkPayload,
): Promise<CreateShareLinkResponse> {
  const response = await axiosClient.post<CreateShareLinkResponse>(
    `/admin/websites/${websiteId}/share-links`,
    payload,
  );

  return normalizeCreateShareLinkResponse(response.data);
}

export async function createCanonicalShareLink(
  websiteId: string,
  videoId: string,
): Promise<CanonicalShareLinkResponse> {
  const response = await axiosClient.post<CanonicalShareLinkResponse>(
    `/admin/websites/${websiteId}/videos/${encodeURIComponent(videoId)}/canonical-share-link`,
  );

  return response.data;
}

export async function getCanonicalShareLink(
  websiteId: string,
  videoId: string,
): Promise<CanonicalShareLinkResponse> {
  const response = await axiosClient.get<CanonicalShareLinkResponse>(
    `/admin/websites/${websiteId}/videos/${encodeURIComponent(videoId)}/canonical-share-link`,
  );

  return response.data;
}

export async function getShareLinks(
  websiteId: string,
): Promise<ShareLinksListResponse> {
  const response = await axiosClient.get<ShareLinksListResponse>(
    `/admin/websites/${websiteId}/share-links`,
  );

  return {
    ...response.data,
    items: response.data.items.map(normalizeShareLinkResponse),
  };
}

export async function revokeShareLink(
  shareLinkId: string,
): Promise<{ message: string }> {
  const response = await axiosClient.post<{ message: string }>(
    `/admin/share-links/${shareLinkId}/revoke`,
  );

  return response.data;
}
