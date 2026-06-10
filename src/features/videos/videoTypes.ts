export type VideoProvider = "MANUAL" | "BUNNY" | "MUX" | "CLOUDINARY";

export type VideoSourceType = "UPLOAD" | "DIRECT_URL" | "EMBED" | "DB_BLOB";

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
  binaryPlaybackUrl?: string | null;
  createdAt: string;
  updatedAt: string;
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
  thumbnailUrl?: string;
  thumbnailFile?: File;
  durationSeconds?: number;
  viewCount?: number;
  publishedAt?: string;
  status?: VideoStatus;
};

export type UploadVideoPayload = {
  title: string;
  description?: string;
  file: File;
  thumbnailUrl?: string;
  thumbnailFile?: File;
  durationSeconds?: number;
  viewCount?: number;
  publishedAt?: string;
  status?: VideoStatus;
};

export type UploadDatabaseVideoPayload = {
  title: string;
  description?: string;
  file: File;
  thumbnailUrl?: string;
  thumbnailFile?: File;
  durationSeconds?: number;
  viewCount?: number;
  publishedAt?: string;
  status?: VideoStatus;
};

export type ReplaceDatabaseVideoBinaryPayload = {
  file: File;
  thumbnailUrl?: string;
  thumbnailFile?: File;
  durationSeconds?: number;
  status?: VideoStatus;
};

export type UpdateVideoPayload = {
  title?: string;
  description?: string | null;
  playbackUrl?: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  viewCount?: number;
  publishedAt?: string | null;
  status?: VideoStatus;
};
