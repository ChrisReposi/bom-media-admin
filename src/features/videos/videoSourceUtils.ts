import type { VideoAsset } from "./videoTypes";

export type VideoSourceFilter = "all" | "link" | "embed" | "db-blob";

export function isDatabaseVideo(video: VideoAsset): boolean {
  return video.sourceType === "DB_BLOB";
}

export function hasPlayableDatabaseBinary(video: VideoAsset): boolean {
  const binaryAsset = video.binaryAsset;

  if (!binaryAsset) {
    return false;
  }

  const sizeBytes = Number(binaryAsset.sizeBytes);

  return (
    binaryAsset.mimeType.startsWith("video/") &&
    Number.isFinite(sizeBytes) &&
    sizeBytes > 0
  );
}

export function isEmbedVideo(video: VideoAsset): boolean {
  return video.sourceType === "EMBED" || Boolean(video.embedUrl);
}

export function isLinkVideo(video: VideoAsset): boolean {
  return (
    !isDatabaseVideo(video) &&
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

  return Boolean(video.embedUrl || video.playbackUrl);
}

export function getVideoSourceLabel(
  video: VideoAsset,
): "Embed" | "Link" | "Database" | "Unknown" {
  if (isDatabaseVideo(video)) {
    return "Database";
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
): "direct" | "embed" | "db-blob" | "not-playable" {
  if (video.status !== "READY") {
    return "not-playable";
  }

  if (isDatabaseVideo(video)) {
    return hasPlayableDatabaseBinary(video) ? "db-blob" : "not-playable";
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

  if (filter === "db-blob") {
    return videos.filter(isDatabaseVideo);
  }

  return videos;
}
