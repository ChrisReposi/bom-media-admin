import type { VideoAsset } from "./videoTypes";

export type VideoSourceFilter =
  | "all"
  | "link"
  | "embed"
  | "local-file"
  | "db-blob";

function hasPlayableVideoAsset(
  asset:
    | {
        mimeType: string;
        sizeBytes: string | number;
      }
    | null
    | undefined,
): boolean {
  if (!asset) {
    return false;
  }

  const sizeBytes = Number(asset.sizeBytes);

  return (
    asset.mimeType.startsWith("video/") &&
    Number.isFinite(sizeBytes) &&
    sizeBytes > 0
  );
}

export function isDatabaseVideo(video: VideoAsset): boolean {
  return video.sourceType === "DB_BLOB";
}

export function hasPlayableDatabaseBinary(video: VideoAsset): boolean {
  return hasPlayableVideoAsset(video.binaryAsset);
}

export function isLocalFileVideo(video: VideoAsset): boolean {
  return video.sourceType === "LOCAL_FILE";
}

export function hasPlayableLocalFile(video: VideoAsset): boolean {
  return hasPlayableVideoAsset(video.localFileAsset);
}

export function isEmbedVideo(video: VideoAsset): boolean {
  return video.sourceType === "EMBED" || Boolean(video.embedUrl);
}

export function isLinkVideo(video: VideoAsset): boolean {
  return (
    !isDatabaseVideo(video) &&
    !isLocalFileVideo(video) &&
    !isEmbedVideo(video) &&
    Boolean(video.playbackUrl)
  );
}

export function isShareableVideo(video: VideoAsset): boolean {
  if (video.status !== "READY") {
    return false;
  }

  if (isDatabaseVideo(video)) {
    return hasPlayableDatabaseBinary(video);
  }

  if (isLocalFileVideo(video)) {
    return hasPlayableLocalFile(video);
  }

  return Boolean(video.embedUrl || video.playbackUrl);
}

export function getVideoSourceLabel(
  video: VideoAsset,
): "Embed" | "Link" | "Server" | "Database" | "Unknown" {
  if (isDatabaseVideo(video)) {
    return "Database";
  }

  if (isLocalFileVideo(video)) {
    return "Server";
  }

  if (isEmbedVideo(video)) {
    return "Embed";
  }

  if (isLinkVideo(video)) {
    return "Link";
  }

  return "Unknown";
}

export function getVideoPlaybackKind(
  video: VideoAsset,
): "direct" | "embed" | "local-file" | "db-blob" | "not-playable" {
  if (video.status !== "READY") {
    return "not-playable";
  }

  if (isDatabaseVideo(video)) {
    return hasPlayableDatabaseBinary(video) ? "db-blob" : "not-playable";
  }

  if (isLocalFileVideo(video)) {
    return hasPlayableLocalFile(video) ? "local-file" : "not-playable";
  }

  if (isEmbedVideo(video) && video.embedUrl) {
    return "embed";
  }

  if (isLinkVideo(video)) {
    return "direct";
  }

  return "not-playable";
}

export function filterVideosBySource(
  videos: VideoAsset[],
  filter: VideoSourceFilter,
): VideoAsset[] {
  if (filter === "link") {
    return videos.filter(isLinkVideo);
  }

  if (filter === "embed") {
    return videos.filter(isEmbedVideo);
  }

  if (filter === "local-file") {
    return videos.filter(isLocalFileVideo);
  }

  if (filter === "db-blob") {
    return videos.filter(isDatabaseVideo);
  }

  return videos;
}
