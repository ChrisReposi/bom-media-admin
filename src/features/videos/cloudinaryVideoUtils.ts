type CloudinaryThumbnailOptions = {
  startOffsetSeconds?: number;
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "limit";
  quality?: "auto" | number;
};

type VideoMetadata = {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
};

const CLOUDINARY_VIDEO_UPLOAD_SEGMENT = "/video/upload/";

export function isCloudinaryVideoUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    return (
      parsedUrl.hostname === "res.cloudinary.com" &&
      parsedUrl.pathname.includes(CLOUDINARY_VIDEO_UPLOAD_SEGMENT)
    );
  } catch {
    return false;
  }
}

export function buildCloudinaryThumbnailUrl(
  playbackUrl: string,
  options?: CloudinaryThumbnailOptions,
): string | null {
  if (!isCloudinaryVideoUrl(playbackUrl)) {
    return null;
  }

  try {
    const parsedUrl = new URL(playbackUrl);
    const [prefix, assetPath] = parsedUrl.pathname.split(
      CLOUDINARY_VIDEO_UPLOAD_SEGMENT,
    );

    if (!prefix || !assetPath) {
      return null;
    }

    const transformation = buildTransformation(options);
    const jpgAssetPath = replaceFinalExtension(assetPath, "jpg");
    parsedUrl.pathname = `${prefix}${CLOUDINARY_VIDEO_UPLOAD_SEGMENT}${transformation}/${jpgAssetPath}`;
    parsedUrl.search = "";
    parsedUrl.hash = "";

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

export function getDefaultThumbnailUrlFromPlaybackUrl(
  playbackUrl: string,
): string | null {
  return buildCloudinaryThumbnailUrl(playbackUrl);
}

export function probeVideoMetadata(
  playbackUrl: string,
  options?: { timeoutMs?: number },
): Promise<VideoMetadata> {
  const timeoutMs = options?.timeoutMs ?? 8000;

  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;

    function cleanup(): void {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleFailure);
      video.removeAttribute("src");
      video.load();
    }

    function resolveOnce(metadata: VideoMetadata): void {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      cleanup();
      resolve(metadata);
    }

    function handleLoadedMetadata(): void {
      const duration = Number.isFinite(video.duration)
        ? Math.round(video.duration)
        : null;

      resolveOnce({
        durationSeconds: duration,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      });
    }

    function handleFailure(): void {
      resolveOnce({
        durationSeconds: null,
        width: null,
        height: null,
      });
    }

    const timeoutId = window.setTimeout(handleFailure, timeoutMs);

    video.preload = "metadata";
    video.crossOrigin = "anonymous";
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("error", handleFailure);
    video.src = playbackUrl;
  });
}

function buildTransformation(options?: CloudinaryThumbnailOptions): string {
  const startOffset = options?.startOffsetSeconds ?? 1;
  const width = options?.width ?? 640;
  const crop = options?.crop ?? "fill";
  const quality = options?.quality ?? "auto";

  return [
    `so_${Math.max(0, startOffset)}`,
    `w_${Math.max(1, width)}`,
    options?.height ? `h_${Math.max(1, options.height)}` : null,
    `c_${crop}`,
    `q_${quality}`,
  ]
    .filter((part): part is string => part !== null)
    .join(",");
}

function replaceFinalExtension(
  assetPath: string,
  nextExtension: string,
): string {
  const lastSlashIndex = assetPath.lastIndexOf("/");
  const directory =
    lastSlashIndex >= 0 ? assetPath.slice(0, lastSlashIndex + 1) : "";
  const filename =
    lastSlashIndex >= 0 ? assetPath.slice(lastSlashIndex + 1) : assetPath;
  const extensionIndex = filename.lastIndexOf(".");

  if (extensionIndex <= 0) {
    return `${assetPath}.${nextExtension}`;
  }

  return `${directory}${filename.slice(0, extensionIndex)}.${nextExtension}`;
}
