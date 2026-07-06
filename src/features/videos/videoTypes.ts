export type VideoProvider = "MANUAL" | "BUNNY" | "MUX" | "CLOUDINARY";

export type VideoSourceType =
  | "UPLOAD"
  | "DIRECT_URL"
  | "EMBED"
  | "DB_BLOB"
  | "LOCAL_FILE";

export type EmbedProvider =
  | "CLOUDINARY_PLAYER"
  | "YOUTUBE"
  | "YOUTUBE_NOCOOKIE"
  | "VIMEO"
  | "GENERIC_IFRAME";

export type VideoStatus =
  | "DRAFT"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "DISABLED";

export const VIDEO_STATUS_OPTIONS = [
  "DRAFT",
  "PROCESSING",
  "READY",
  "FAILED",
  "DISABLED",
] as const satisfies readonly VideoStatus[];

export type VideoAsset = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  provider: VideoProvider;
  sourceType?: VideoSourceType | null;
  providerAssetId: string | null;
  playbackId: string | null;
  playbackUrl: string | null;
  filterKey?: string | null;
  embedProvider?: EmbedProvider | null;
  embedUrl: string | null;
  embedCloudName?: string | null;
  embedPublicId?: string | null;
  embedAllow?: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: string | number;
  publishedAt: string | null;
  status: VideoStatus;
  metadataJson: unknown | null;
  binaryAsset?: {
    mimeType: string;
    sizeBytes: string;
  } | null;
  localFileAsset?: {
    mimeType: string;
    sizeBytes: string;
    checksumSha256?: string | null;
    originalFilename?: string | null;
  } | null;
  localThumbnailAsset?: {
    mimeType: string;
    sizeBytes: string;
    checksumSha256?: string | null;
    originalFilename?: string | null;
  } | null;
  binaryPlaybackUrl?: string | null;
  localPlaybackUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VideoUploadSessionStatus =
  | "ACTIVE"
  | "COMPLETING"
  | "COMPLETED"
  | "ABORTED"
  | "EXPIRED"
  | "FAILED";

export type VideoUploadSession = {
  id: string;
  status: VideoUploadSessionStatus;
  totalBytes: number;
  totalChunks: number;
  chunkSizeBytes: number;
  uploadedChunks: number;
  uploadedChunkIndexes: number[];
  expiresAt: string;
};

export type VideosListResponse = {
  items: VideoAsset[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateVideoManualPayload = {
  title: string;
  description?: string;
  playbackUrl: string;
  filterKey?: string;
  thumbnailUrl?: string;
  thumbnailFile?: File;
  durationSeconds?: number;
  viewCount?: number;
  publishedAt?: string;
  status?: VideoStatus;
};

export type CreateVideoEmbedPayload = {
  title: string;
  description?: string;
  embedCodeOrUrl: string;
  filterKey?: string;
  thumbnailUrl?: string;
  thumbnailFile?: File;
  durationSeconds?: number;
  viewCount?: number;
  publishedAt?: string;
  status?: VideoStatus;
};

export type UploadLocalVideoPayload = {
  title: string;
  description?: string;
  file: File;
  filterKey?: string;
  thumbnailUrl?: string;
  thumbnailFile?: File;
  durationSeconds?: number;
  viewCount?: number;
  publishedAt?: string;
  status?: VideoStatus;
};

export type UploadLocalVideoProgress = {
  phase: "init" | "uploading" | "complete" | "canceling";
  uploadId?: string;
  uploadedChunks: number;
  totalChunks: number;
  percent: number;
};

export type ReplaceDatabaseVideoBinaryPayload = {
  file: File;
  thumbnailUrl?: string;
  thumbnailFile?: File;
  durationSeconds?: number;
  status?: VideoStatus;
};

export type UpdateLocalVideoThumbnailPayload = {
  thumbnailFile: File;
};

export type UpdateVideoPayload = {
  title?: string;
  description?: string | null;
  playbackUrl?: string;
  filterKey?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  viewCount?: number;
  publishedAt?: string | null;
  status?: VideoStatus;
};

export type PurgeVideoPayload = {
  confirmVideoId: string;
  deleteRemoteAsset?: boolean;
};

export type PurgeVideoResponse = {
  message: string;
  videoId?: string;
  sourceType?: VideoSourceType | string;
  status?: "PURGED" | string;
  safety?: {
    hadWebsiteAssignments?: boolean;
    hadShareLinks?: boolean;
    activeWebsiteAssignmentCount?: number;
    disabledShareLinkCount?: number;
    detachedShareLinkVideoCount?: number;
  };
  storage?: {
    localVideoDeleteAttempted?: boolean;
    localVideoDeleted?: boolean;
    localThumbnailDeleteAttempted?: boolean;
    localThumbnailDeleted?: boolean;
    bytesReclaimed?: string;
    orphanCleanupRequired?: boolean;
  };
  remote?: {
    remoteAssetDeleteAttempted?: boolean;
    remoteAssetDeleted?: boolean;
  };
};
