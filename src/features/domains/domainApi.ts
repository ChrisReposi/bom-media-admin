import { axiosClient } from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/api/apiError";

import type {
  AssignDomainPayload,
  CreateDomainGroupPayload,
  CreateDomainPayload,
  DomainGroupsListResponse,
  DomainsListResponse,
  DomainStatus,
  DomainUsageStatus,
  DomainGroup,
  DomainGroupStatus,
  DomainPoolItem,
  UpdateDomainGroupPayload,
  UpdateDomainPayload,
} from "./domainTypes";

export function getDomainApiErrorMessage(error: unknown): string {
  return getApiErrorMessage(error);
}

export async function getDomains(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: DomainStatus;
  usageStatus?: DomainUsageStatus;
  domainGroupKey?: string;
  websiteId?: string;
}): Promise<DomainsListResponse> {
  const response = await axiosClient.get<DomainsListResponse>(
    "/admin/domains",
    {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search?.trim() || undefined,
        status: params?.status,
        usageStatus: params?.usageStatus,
        domainGroupKey: params?.domainGroupKey?.trim() || undefined,
        websiteId: params?.websiteId?.trim() || undefined,
      },
    },
  );

  return response.data;
}

export async function createDomain(
  payload: CreateDomainPayload,
): Promise<DomainPoolItem> {
  const response = await axiosClient.post<DomainPoolItem>("/admin/domains", {
    domain: payload.domain.trim(),
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

export async function updateDomain(
  domainId: string,
  payload: UpdateDomainPayload,
): Promise<DomainPoolItem> {
  const response = await axiosClient.patch<DomainPoolItem>(
    `/admin/domains/${domainId}`,
    {
      ...(payload.domain?.trim() ? { domain: payload.domain.trim() } : {}),
      ...(payload.domainGroupKey?.trim()
        ? { domainGroupKey: payload.domainGroupKey.trim().toLowerCase() }
        : {}),
      ...(payload.domainGroupId === null
        ? { domainGroupId: null }
        : payload.domainGroupId?.trim()
          ? { domainGroupId: payload.domainGroupId.trim() }
          : {}),
      ...(payload.status ? { status: payload.status } : {}),
    },
  );

  return response.data;
}

export async function disableDomain(domainId: string): Promise<DomainPoolItem> {
  const response = await axiosClient.delete<DomainPoolItem>(
    `/admin/domains/${domainId}`,
  );

  return response.data;
}

export async function activateDomain(
  domainId: string,
): Promise<DomainPoolItem> {
  const response = await axiosClient.post<DomainPoolItem>(
    `/admin/domains/${domainId}/activate`,
  );

  return response.data;
}

export async function assignDomainToWebsite(
  domainId: string,
  payload: AssignDomainPayload,
): Promise<DomainPoolItem> {
  const response = await axiosClient.post<DomainPoolItem>(
    `/admin/domains/${domainId}/assign`,
    {
      websiteId: payload.websiteId,
      ...(payload.replaceExisting !== undefined
        ? { replaceExisting: payload.replaceExisting }
        : {}),
    },
  );

  return response.data;
}

export async function unassignDomain(
  domainId: string,
): Promise<DomainPoolItem> {
  const response = await axiosClient.post<DomainPoolItem>(
    `/admin/domains/${domainId}/unassign`,
  );

  return response.data;
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

export async function createDomainGroup(
  payload: CreateDomainGroupPayload,
): Promise<DomainGroup> {
  const response = await axiosClient.post<DomainGroup>("/admin/domain-groups", {
    key: payload.key.trim().toLowerCase(),
    name: payload.name.trim(),
    ...(payload.description?.trim()
      ? { description: payload.description.trim() }
      : {}),
    ...(payload.status ? { status: payload.status } : {}),
  });

  return response.data;
}

export async function updateDomainGroup(
  groupId: string,
  payload: UpdateDomainGroupPayload,
): Promise<DomainGroup> {
  const response = await axiosClient.patch<DomainGroup>(
    `/admin/domain-groups/${groupId}`,
    {
      ...(payload.key?.trim() ? { key: payload.key.trim().toLowerCase() } : {}),
      ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
      ...(payload.description !== undefined
        ? payload.description?.trim()
          ? { description: payload.description.trim() }
          : { description: "" }
        : {}),
      ...(payload.status ? { status: payload.status } : {}),
    },
  );

  return response.data;
}

export async function disableDomainGroup(
  groupId: string,
): Promise<{ message: string }> {
  const response = await axiosClient.delete<{ message: string }>(
    `/admin/domain-groups/${groupId}`,
  );

  return response.data;
}
