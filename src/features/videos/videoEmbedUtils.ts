const SAFE_PREVIEW_EMBED_HOSTS = new Set([
  "player.cloudinary.com",
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
]);

export function extractIframeSrc(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.toLowerCase().includes("<iframe")) {
    const match = trimmed.match(
      /\ssrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
    );
    const src = match?.[1] ?? match?.[2] ?? match?.[3];

    return src?.trim() || null;
  }

  return trimmed;
}

export function isSafePreviewEmbedUrl(url: string): boolean {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return false;
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    return false;
  }

  return SAFE_PREVIEW_EMBED_HOSTS.has(parsedUrl.hostname.toLowerCase());
}
