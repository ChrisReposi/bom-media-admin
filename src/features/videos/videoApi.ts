import { axiosClient } from "@/lib/api/axiosClient";
import {
  getApiErrorMessage as getSharedApiErrorMessage,
  normalizeApiError,
} from "@/lib/api/apiError";

import type {
  CreateVideoEmbedPayload,
  CreateVideoManualPayload,
  ReplaceDatabaseVideoBinaryPayload,
  UpdateVideoPayload,
  UploadDatabaseVideoPayload,
  UploadVideoPayload,
  VideoAsset,
  VideoProvider,
  VideosListResponse,
  VideoStatus,
} from "./videoTypes";

type VideoSortOrder = "asc" | "desc";

type VideoSortBy = "createdAt" | "updatedAt" | "publishedAt" | "title";

type GetVideosParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: VideoStatus;
  provider?: VideoProvider;
  sortBy?: VideoSortBy;
  sortOrder?: VideoSortOrder;
};

type VideoDetailResponse = VideoAsset | { data: VideoAsset };

export function getApiErrorMessage(error: unknown): string {
  if (normalizeApiError(error).status === 404) {
    return "Khong tim thay video.";
  }

  return getSharedApiErrorMessage(error);
}

function isSafePersistedThumbnailUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanThumbnailUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed || !isSafePersistedThumbnailUrl(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function cleanManualPayload(
  payload: CreateVideoManualPayload,
): CreateVideoManualPayload {
  const thumbnailUrl = cleanThumbnailUrl(payload.thumbnailUrl);

  return {
    title: payload.title.trim(),
    playbackUrl: payload.playbackUrl.trim(),
    ...(payload.description?.trim()
      ? { description: payload.description.trim() }
      : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(payload.durationSeconds !== undefined
      ? { durationSeconds: payload.durationSeconds }
      : {}),
    ...(payload.viewCount !== undefined
      ? { viewCount: payload.viewCount }
      : {}),
    ...(payload.publishedAt ? { publishedAt: payload.publishedAt } : {}),
    ...(payload.status ? { status: payload.status } : {}),
  };
}

function cleanEmbedPayload(
  payload: CreateVideoEmbedPayload,
): CreateVideoEmbedPayload {
  const thumbnailUrl = cleanThumbnailUrl(payload.thumbnailUrl);

  return {
    title: payload.title.trim(),
    embedCodeOrUrl: payload.embedCodeOrUrl.trim(),
    ...(payload.description?.trim()
      ? { description: payload.description.trim() }
      : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(payload.durationSeconds !== undefined
      ? { durationSeconds: payload.durationSeconds }
      : {}),
    ...(payload.viewCount !== undefined
      ? { viewCount: payload.viewCount }
      : {}),
    ...(payload.publishedAt ? { publishedAt: payload.publishedAt } : {}),
    ...(payload.status ? { status: payload.status } : {}),
  };
}

function appendOptionalVideoFormFields(
  formData: FormData,
  payload: {
    description?: string;
    thumbnailUrl?: string;
    thumbnailFile?: File;
    durationSeconds?: number;
    viewCount?: number;
    publishedAt?: string;
    status?: VideoStatus;
  },
): void {
  const thumbnailUrl = cleanThumbnailUrl(payload.thumbnailUrl);

  if (payload.description?.trim()) {
    formData.append("description", payload.description.trim());
  }

  if (payload.thumbnailFile) {
    formData.append("thumbnailFile", payload.thumbnailFile);
  } else if (thumbnailUrl) {
    formData.append("thumbnailUrl", thumbnailUrl);
  }

  if (payload.durationSeconds !== undefined) {
    formData.append("durationSeconds", String(payload.durationSeconds));
  }

  if (payload.viewCount !== undefined) {
    formData.append("viewCount", String(payload.viewCount));
  }

  if (payload.publishedAt) {
    formData.append("publishedAt", payload.publishedAt);
  }

  if (payload.status) {
    formData.append("status", payload.status);
  }
}

function unwrapVideoResponse(response: VideoDetailResponse): VideoAsset {
  if ("data" in response) {
    return response.data;
  }

  return response;
}

function cleanUpdatePayload(payload: UpdateVideoPayload): UpdateVideoPayload {
  return {
    ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
    ...(payload.description !== undefined
      ? payload.description?.trim()
        ? { description: payload.description.trim() }
        : {}
      : {}),
    ...(payload.playbackUrl?.trim()
      ? { playbackUrl: payload.playbackUrl.trim() }
      : {}),
    ...(payload.thumbnailUrl !== undefined
      ? payload.thumbnailUrl?.trim()
        ? { thumbnailUrl: payload.thumbnailUrl.trim() }
        : {}
      : {}),
    ...(payload.durationSeconds !== undefined &&
    payload.durationSeconds !== null
      ? { durationSeconds: payload.durationSeconds }
      : {}),
    ...(payload.viewCount !== undefined
      ? { viewCount: payload.viewCount }
      : {}),
    ...(payload.publishedAt ? { publishedAt: payload.publishedAt } : {}),
    ...(payload.status ? { status: payload.status } : {}),
  };
}

export async function getVideos(
  params?: GetVideosParams,
): Promise<VideosListResponse> {
  const response = await axiosClient.get<VideosListResponse>("/admin/videos", {
    params: {
      page: params?.page,
      limit: params?.limit,
      search: params?.search?.trim() || undefined,
      status: params?.status,
      provider: params?.provider,
      sortBy: params?.sortBy ?? "createdAt",
      sortOrder: params?.sortOrder ?? "desc",
    },
  });

  return response.data;
}

export async function getVideoById(id: string): Promise<VideoAsset> {
  const response = await axiosClient.get<VideoDetailResponse>(
    `/admin/videos/${id}`,
  );

  return unwrapVideoResponse(response.data);
}

export async function getDatabaseVideoBinaryBlob(id: string): Promise<Blob> {
  const response = await axiosClient.get<Blob>(`/admin/videos/${id}/binary`, {
    responseType: "blob",
  });

  return response.data;
}

export async function createVideoManual(
  payload: CreateVideoManualPayload,
): Promise<VideoAsset> {
  const response = await axiosClient.post<VideoAsset>(
    "/admin/videos",
    cleanManualPayload(payload),
  );

  return response.data;
}

export async function createVideoManualWithThumbnail(
  payload: CreateVideoManualPayload,
): Promise<VideoAsset> {
  const formData = new FormData();

  formData.append("title", payload.title.trim());
  formData.append("playbackUrl", payload.playbackUrl.trim());
  appendOptionalVideoFormFields(formData, payload);

  const response = await axiosClient.post<VideoAsset>(
    "/admin/videos/manual-with-thumbnail",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 0,
    },
  );

  return response.data;
}

export async function createVideoEmbed(
  payload: CreateVideoEmbedPayload,
): Promise<VideoAsset> {
  const response = await axiosClient.post<VideoAsset>(
    "/admin/videos/embed",
    cleanEmbedPayload(payload),
  );

  return response.data;
}

export async function createVideoEmbedWithThumbnail(
  payload: CreateVideoEmbedPayload,
): Promise<VideoAsset> {
  const formData = new FormData();

  formData.append("title", payload.title.trim());
  formData.append("embedCodeOrUrl", payload.embedCodeOrUrl.trim());
  appendOptionalVideoFormFields(formData, payload);

  const response = await axiosClient.post<VideoAsset>(
    "/admin/videos/embed-with-thumbnail",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 0,
    },
  );

  return response.data;
}

export async function updateVideo(
  id: string,
  payload: UpdateVideoPayload,
): Promise<VideoAsset> {
  const response = await axiosClient.patch<VideoDetailResponse>(
    `/admin/videos/${id}`,
    cleanUpdatePayload(payload),
  );

  return unwrapVideoResponse(response.data);
}

export async function uploadVideo(
  payload: UploadVideoPayload,
): Promise<VideoAsset> {
  const formData = new FormData();

  formData.append("file", payload.file);
  formData.append("title", payload.title.trim());
  appendOptionalVideoFormFields(formData, payload);

  const response = await axiosClient.post<VideoAsset>(
    "/admin/videos/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 0,
    },
  );

  return response.data;
}

export async function uploadDatabaseVideo(
  payload: UploadDatabaseVideoPayload,
): Promise<VideoAsset> {
  const formData = new FormData();

  formData.append("file", payload.file);
  formData.append("title", payload.title.trim());
  appendOptionalVideoFormFields(formData, payload);

  const response = await axiosClient.post<VideoAsset>(
    "/admin/videos/upload-db",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 0,
    },
  );

  return response.data;
}

export async function replaceDatabaseVideoBinary(
  id: string,
  payload: ReplaceDatabaseVideoBinaryPayload,
): Promise<VideoAsset> {
  const formData = new FormData();

  formData.append("file", payload.file);
  appendOptionalVideoFormFields(formData, payload);

  const response = await axiosClient.patch<VideoDetailResponse>(
    `/admin/videos/${id}/binary`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 0,
    },
  );

  return unwrapVideoResponse(response.data);
}

export async function deleteVideo(id: string): Promise<{ message: string }> {
  const response = await axiosClient.delete<{ message: string }>(
    `/admin/videos/${id}`,
  );

  return response.data;
}
