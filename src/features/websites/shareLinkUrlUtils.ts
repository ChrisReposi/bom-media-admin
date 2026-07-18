// Optional-chained through `env` so the module stays importable under plain
// Node (tests) where import.meta.env does not exist.
const PUBLIC_SHARE_BASE_URL =
  (
    import.meta as { env?: { VITE_PUBLIC_SHARE_BASE_URL?: string } }
  ).env?.VITE_PUBLIC_SHARE_BASE_URL?.trim() || "";

type ShareRouteParts = {
  code: string;
  videoId: string;
};

// Public sites are static hash-router SPAs. /s/<code> requires server rewrite,
// while /#/s/<code>/videos works on static hosting and local nested Live Server paths.
export function normalizePublicShareUrl(
  publicUrl: string | null | undefined,
): string | null {
  const trimmedUrl = publicUrl?.trim();

  if (!trimmedUrl) {
    return null;
  }

  try {
    const url = new URL(trimmedUrl);

    if (containsAdminPath(url.pathname)) {
      return null;
    }

    const pathShareRoute = extractShareRouteFromPath(url.pathname);
    const hashShareRoute = extractShareRouteFromHash(url.hash);
    const hashVideoRouteForPathCode =
      pathShareRoute && !hashShareRoute
        ? extractVideoRouteForPathCode(url.pathname, url.hash)
        : null;
    const shareRoute =
      hashShareRoute ?? hashVideoRouteForPathCode ?? pathShareRoute;

    if (!shareRoute) {
      return trimmedUrl;
    }

    const baseUrl =
      getConfiguredPublicShareBaseUrl() ??
      getDerivedPublicShareBaseUrl(url, pathShareRoute !== null);

    return buildHashSafeShareUrl(baseUrl, shareRoute);
  } catch {
    return trimmedUrl;
  }
}

function getConfiguredPublicShareBaseUrl(): string | null {
  return normalizeBaseUrl(PUBLIC_SHARE_BASE_URL);
}

function getDerivedPublicShareBaseUrl(
  url: URL,
  codeCameFromPath: boolean,
): string {
  if (!codeCameFromPath) {
    return normalizeBaseUrl(`${url.origin}${url.pathname}`) ?? url.origin;
  }

  const basePath = getPathBeforeShareMarker(url.pathname);

  return normalizeBaseUrl(`${url.origin}${basePath}`) ?? url.origin;
}

function buildHashSafeShareUrl(baseUrl: string, shareRoute: ShareRouteParts) {
  const encodedCode = encodeURIComponent(shareRoute.code);
  const encodedVideoId = shareRoute.videoId
    ? `/${encodeURIComponent(shareRoute.videoId)}`
    : "";

  return `${baseUrl}/#/s/${encodedCode}/videos${encodedVideoId}`;
}

function extractShareRouteFromPath(pathname: string): ShareRouteParts | null {
  const segments = getPathSegments(pathname);
  const markerIndex = findShareMarkerIndex(segments);

  if (markerIndex < 0) {
    return null;
  }

  return buildShareRouteFromSegments(segments, markerIndex);
}

function extractShareRouteFromHash(hash: string): ShareRouteParts | null {
  const routeText = hash.replace(/^#/, "").split("?")[0] ?? "";
  const segments = getPathSegments(routeText);
  const markerIndex = findShareMarkerIndex(segments);

  if (markerIndex < 0) {
    return null;
  }

  return buildShareRouteFromSegments(segments, markerIndex);
}

function extractVideoRouteForPathCode(
  pathname: string,
  hash: string,
): ShareRouteParts | null {
  const pathShareRoute = extractShareRouteFromPath(pathname);

  if (!pathShareRoute) {
    return null;
  }

  const hashSegments = getPathSegments(hash.replace(/^#/, "").split("?")[0]);

  if (hashSegments[0]?.toLowerCase() !== "videos") {
    return pathShareRoute;
  }

  return {
    code: pathShareRoute.code,
    videoId: hashSegments.length > 1 ? hashSegments.slice(1).join("/") : "",
  };
}

function buildShareRouteFromSegments(
  segments: string[],
  markerIndex: number,
): ShareRouteParts | null {
  const code = segments[markerIndex + 1]?.trim();

  if (!code) {
    return null;
  }

  const afterCodeSegments = segments.slice(markerIndex + 2);
  const videosIndex = afterCodeSegments.findIndex(
    (segment) => segment.toLowerCase() === "videos",
  );
  const videoId =
    videosIndex >= 0 && afterCodeSegments[videosIndex + 1]
      ? afterCodeSegments.slice(videosIndex + 1).join("/")
      : "";

  return { code, videoId };
}

function getPathBeforeShareMarker(pathname: string): string {
  const segments = getPathSegments(pathname);
  const markerIndex = findShareMarkerIndex(segments);

  if (markerIndex <= 0) {
    return "";
  }

  return `/${segments
    .slice(0, markerIndex)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function getPathSegments(value: string): string[] {
  return String(value || "")
    .replace(/^#/, "")
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    .map(decodePathSegment);
}

function findShareMarkerIndex(segments: string[]): number {
  return segments.findIndex((segment) => segment.toLowerCase() === "s");
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function normalizeBaseUrl(baseUrl: string): string | null {
  const trimmedBaseUrl = baseUrl.trim();

  if (!trimmedBaseUrl) {
    return null;
  }

  try {
    const url = new URL(trimmedBaseUrl);

    if (containsAdminPath(url.pathname)) {
      return null;
    }

    return `${url.origin}${url.pathname.replace(/\/+$/g, "")}`;
  } catch {
    return null;
  }
}

function containsAdminPath(pathname: string): boolean {
  return /(?:^|\/)admin(?:\/|$)/i.test(pathname);
}
