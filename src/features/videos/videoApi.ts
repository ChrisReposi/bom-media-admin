import { axiosClient } from "@/lib/api/axiosClient";
import { invalidateAllDashboardVideoPageCache } from "@/features/dashboard/dashboardCache";
import {
  getApiErrorMessage as getSharedApiErrorMessage,
  normalizeApiError,
} from "@/lib/api/apiError";

import { normalizeVideoFilterKeyInput } from "./videoFilterKeyUtils";
import { cleanUpdatePayload, cleanVideoFilterKey } from "./videoUpdatePayload";
import {
  completeLocalUploadWithRecovery,
  LocalUploadCompletionStateError,
} from "./localUploadCompletion";
import type {
  CreateVideoEmbedPayload,
  CreateVideoManualPayload,
  PurgeVideoPayload,
  PurgeVideoResponse,
  ReplaceDatabaseVideoBinaryPayload,
  UpdateLocalVideoThumbnailPayload,
  UpdateVideoPayload,
  UploadLocalVideoPayload,
  UploadLocalVideoProgress,
  VideoAsset,
  VideoProvider,
  VideoUploadSession,
  VideosListResponse,
  VideoStatus,
} from "./videoTypes";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";
const DEFAULT_LOCAL_CHUNK_SIZE_MB = 50;

type VideoSortOrder = "asc" | "desc";

type VideoSortBy = "createdAt" | "updatedAt" | "publishedAt" | "title";

type GetVideosParams = {
  page?: number;
  limit?: number;
  search?: string;
  filterKey?: string;
  status?: VideoStatus;
  provider?: VideoProvider;
  sortBy?: VideoSortBy;
  sortOrder?: VideoSortOrder;
};

type GetVideosOptions = {
  signal?: AbortSignal;
};

type VideoDetailResponse = VideoAsset | { data: VideoAsset };

type InitLocalVideoUploadResponse = {
  message: string;
  upload: VideoUploadSession;
};

type LocalVideoChunkUploadResponse = {
  message: string;
  upload: VideoUploadSession;
};

type CancelLocalVideoUploadResponse = {
  message: string;
};

type UploadLocalVideoOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: UploadLocalVideoProgress) => void;
};

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof LocalUploadCompletionStateError) {
    return error.message;
  }

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
  const filterKey = cleanVideoFilterKey(payload.filterKey);

  return {
    title: payload.title.trim(),
    playbackUrl: payload.playbackUrl.trim(),
    ...(filterKey ? { filterKey } : {}),
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
  const filterKey = cleanVideoFilterKey(payload.filterKey);

  return {
    title: payload.title.trim(),
    embedCodeOrUrl: payload.embedCodeOrUrl.trim(),
    ...(filterKey ? { filterKey } : {}),
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
    filterKey?: string;
    thumbnailUrl?: string;
    thumbnailFile?: File;
    durationSeconds?: number;
    viewCount?: number;
    publishedAt?: string;
    status?: VideoStatus;
  },
): void {
  const thumbnailUrl = cleanThumbnailUrl(payload.thumbnailUrl);
  const filterKey = cleanVideoFilterKey(payload.filterKey);

  if (payload.description?.trim()) {
    formData.append("description", payload.description.trim());
  }

  if (filterKey) {
    formData.append("filterKey", filterKey);
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

function getConfiguredLocalChunkSizeBytes(): number {
  const rawValue = import.meta.env.VITE_LOCAL_VIDEO_CHUNK_SIZE_MB;
  const megabytes =
    typeof rawValue === "string" && rawValue.trim() !== ""
      ? Number(rawValue)
      : DEFAULT_LOCAL_CHUNK_SIZE_MB;

  if (!Number.isFinite(megabytes) || megabytes <= 0) {
    return DEFAULT_LOCAL_CHUNK_SIZE_MB * 1024 * 1024;
  }

  return Math.floor(megabytes * 1024 * 1024);
}

function buildApiResourceUrl(value: string | null | undefined): string {
  const rawValue = value?.trim();
  if (!rawValue) {
    return "";
  }

  try {
    const parsed = new URL(rawValue);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return rawValue;
    }
  } catch {
    // Continue with relative path handling.
  }

  const apiBase = new URL(API_BASE_URL);

  if (rawValue.startsWith("/api/")) {
    return `${apiBase.origin}${rawValue}`;
  }

  if (rawValue.startsWith("/")) {
    return `${API_BASE_URL.replace(/\/+$/g, "")}${rawValue}`;
  }

  return `${API_BASE_URL.replace(/\/+$/g, "")}/${rawValue.replace(/^\/+/g, "")}`;
}

function emitLocalUploadProgress(
  options: UploadLocalVideoOptions | undefined,
  progress: UploadLocalVideoProgress,
): void {
  options?.onProgress?.(progress);
}

export async function getVideos(
  params?: GetVideosParams,
  options?: GetVideosOptions,
): Promise<VideosListResponse> {
  const response = await axiosClient.get<VideosListResponse>("/admin/videos", {
    params: {
      page: params?.page,
      limit: params?.limit,
      search: params?.search?.trim() || undefined,
      filterKey: cleanVideoFilterKey(params?.filterKey),
      status: params?.status,
      provider: params?.provider,
      sortBy: params?.sortBy ?? "createdAt",
      sortOrder: params?.sortOrder ?? "desc",
    },
    signal: options?.signal,
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

export async function getLocalVideoFileBlob(video: VideoAsset): Promise<Blob> {
  const url = buildApiResourceUrl(
    video.localPlaybackUrl ?? `/admin/videos/${video.id}/local-file`,
  );
  const response = await axiosClient.get<Blob>(url, {
    responseType: "blob",
    timeout: 0,
  });

  return response.data;
}

export async function getLocalVideoThumbnailBlob(
  video: Pick<VideoAsset, "id" | "thumbnailUrl">,
): Promise<Blob> {
  const url = buildApiResourceUrl(
    video.thumbnailUrl ?? `/admin/videos/${video.id}/thumbnail`,
  );
  const response = await axiosClient.get<Blob>(url, {
    responseType: "blob",
    timeout: 0,
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

  invalidateAllDashboardVideoPageCache();

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

  invalidateAllDashboardVideoPageCache();

  return response.data;
}

export async function createVideoEmbed(
  payload: CreateVideoEmbedPayload,
): Promise<VideoAsset> {
  const response = await axiosClient.post<VideoAsset>(
    "/admin/videos/embed",
    cleanEmbedPayload(payload),
  );

  invalidateAllDashboardVideoPageCache();

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

  invalidateAllDashboardVideoPageCache();

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

  invalidateAllDashboardVideoPageCache();

  return unwrapVideoResponse(response.data);
}

export async function updateVideoStatus(
  id: string,
  status: VideoStatus,
): Promise<VideoAsset> {
  return updateVideo(id, { status });
}

async function initLocalVideoUpload(
  payload: UploadLocalVideoPayload,
  chunkSizeBytes: number,
  signal?: AbortSignal,
): Promise<VideoUploadSession> {
  const totalChunks = Math.ceil(payload.file.size / chunkSizeBytes);
  const filterKey = cleanVideoFilterKey(payload.filterKey);
  const response = await axiosClient.post<InitLocalVideoUploadResponse>(
    "/admin/videos/upload-local/init",
    {
      title: payload.title.trim(),
      originalFilename: payload.file.name,
      mimeType: payload.file.type || "video/mp4",
      totalBytes: payload.file.size,
      totalChunks,
      chunkSizeBytes,
      ...(filterKey ? { filterKey } : {}),
      ...(payload.description?.trim()
        ? { description: payload.description.trim() }
        : {}),
      ...(payload.viewCount !== undefined
        ? { viewCount: String(payload.viewCount) }
        : {}),
      ...(payload.publishedAt ? { publishedAt: payload.publishedAt } : {}),
      ...(payload.status ? { status: payload.status } : {}),
    },
    { signal },
  );

  return response.data.upload;
}

async function uploadLocalVideoChunk(params: {
  uploadId: string;
  chunkIndex: number;
  chunk: Blob;
  filename: string;
  signal?: AbortSignal;
}): Promise<VideoUploadSession> {
  const formData = new FormData();
  formData.append("chunkIndex", String(params.chunkIndex));
  formData.append("chunk", params.chunk, params.filename);

  const response = await axiosClient.post<LocalVideoChunkUploadResponse>(
    `/admin/videos/upload-local/${encodeURIComponent(params.uploadId)}/chunks`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal: params.signal,
      timeout: 0,
    },
  );

  return response.data.upload;
}

async function requestLocalVideoUploadCompletion(
  uploadId: string,
  payload: Pick<UploadLocalVideoPayload, "thumbnailFile">,
  signal?: AbortSignal,
): Promise<VideoAsset> {
  const formData = new FormData();

  if (payload.thumbnailFile) {
    formData.append("thumbnailFile", payload.thumbnailFile);
  }

  const response = await axiosClient.post<VideoDetailResponse>(
    `/admin/videos/upload-local/${encodeURIComponent(uploadId)}/complete`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal,
      timeout: 0,
    },
  );

  return unwrapVideoResponse(response.data);
}

export async function getLocalVideoUploadStatus(
  uploadId: string,
  signal?: AbortSignal,
): Promise<VideoUploadSession> {
  const response = await axiosClient.get<VideoUploadSession>(
    `/admin/videos/upload-local/${encodeURIComponent(uploadId)}`,
    { signal },
  );

  return response.data;
}

export async function cancelLocalVideoUpload(
  uploadId: string,
): Promise<CancelLocalVideoUploadResponse> {
  const response = await axiosClient.post<CancelLocalVideoUploadResponse>(
    `/admin/videos/upload-local/${encodeURIComponent(uploadId)}/cancel`,
  );

  return response.data;
}

export async function uploadLocalVideo(
  payload: UploadLocalVideoPayload,
  options?: UploadLocalVideoOptions,
): Promise<VideoAsset> {
  const chunkSizeBytes = getConfiguredLocalChunkSizeBytes();
  const totalChunks = Math.ceil(payload.file.size / chunkSizeBytes);

  emitLocalUploadProgress(options, {
    phase: "init",
    uploadedChunks: 0,
    totalChunks,
    percent: 0,
  });

  const upload = await initLocalVideoUpload(
    payload,
    chunkSizeBytes,
    options?.signal,
  );
  let latestUpload = upload;

  for (let chunkIndex = 0; chunkIndex < upload.totalChunks; chunkIndex += 1) {
    if (options?.signal?.aborted) {
      throw new DOMException("Upload canceled.", "AbortError");
    }

    const start = chunkIndex * upload.chunkSizeBytes;
    const end = Math.min(start + upload.chunkSizeBytes, payload.file.size);
    const chunk = payload.file.slice(start, end, payload.file.type);

    latestUpload = await uploadLocalVideoChunk({
      uploadId: upload.id,
      chunkIndex,
      chunk,
      filename: `${payload.file.name}.part-${chunkIndex}`,
      signal: options?.signal,
    });

    emitLocalUploadProgress(options, {
      phase: "uploading",
      uploadId: upload.id,
      uploadedChunks: latestUpload.uploadedChunks,
      totalChunks: latestUpload.totalChunks,
      percent:
        latestUpload.totalChunks > 0
          ? Math.round(
              (latestUpload.uploadedChunks / latestUpload.totalChunks) * 100,
            )
          : 0,
    });
  }

  emitLocalUploadProgress(options, {
    phase: "complete",
    uploadId: upload.id,
    uploadedChunks: latestUpload.uploadedChunks,
    totalChunks: latestUpload.totalChunks,
    percent: 100,
  });

  const createdVideo = await completeLocalUploadWithRecovery({
    uploadId: upload.id,
    complete: () =>
      requestLocalVideoUploadCompletion(
        upload.id,
        { thumbnailFile: payload.thumbnailFile },
        options?.signal,
      ),
    getStatus: () => getLocalVideoUploadStatus(upload.id, options?.signal),
    isConflict: (error) => normalizeApiError(error).status === 409,
    signal: options?.signal,
    onStatus: (status) => {
      emitLocalUploadProgress(options, {
        phase: "reconciling",
        uploadId: upload.id,
        uploadedChunks: status.uploadedChunks,
        totalChunks: status.totalChunks,
        percent: 100,
      });
    },
  });

  if (
    payload.durationSeconds !== undefined ||
    payload.thumbnailUrl !== undefined
  ) {
    const metadataPatch: UpdateVideoPayload = {
      ...(payload.thumbnailUrl !== undefined
        ? { thumbnailUrl: payload.thumbnailUrl }
        : {}),
      ...(payload.durationSeconds !== undefined
        ? { durationSeconds: payload.durationSeconds }
        : {}),
    };

    return updateVideo(createdVideo.id, metadataPatch);
  }

  invalidateAllDashboardVideoPageCache();

  return createdVideo;
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

  invalidateAllDashboardVideoPageCache();

  return unwrapVideoResponse(response.data);
}

export async function updateLocalVideoThumbnail(
  id: string,
  payload: UpdateLocalVideoThumbnailPayload,
): Promise<VideoAsset> {
  const formData = new FormData();
  formData.append("thumbnailFile", payload.thumbnailFile);

  const response = await axiosClient.patch<VideoDetailResponse>(
    `/admin/videos/${id}/thumbnail-local`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 0,
    },
  );

  invalidateAllDashboardVideoPageCache();

  return unwrapVideoResponse(response.data);
}

export async function purgeVideo(
  id: string,
  payload: PurgeVideoPayload,
): Promise<PurgeVideoResponse> {
  const response = await axiosClient.post<PurgeVideoResponse>(
    `/admin/videos/${id}/purge`,
    payload,
  );

  invalidateAllDashboardVideoPageCache();

  return response.data;
}

export async function deleteVideo(id: string): Promise<{ message: string }> {
  const response = await axiosClient.delete<{ message: string }>(
    `/admin/videos/${id}`,
  );

  invalidateAllDashboardVideoPageCache();

  return response.data;
}
