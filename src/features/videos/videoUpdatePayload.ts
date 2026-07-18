import type { UpdateVideoPayload } from "./videoTypes";
import { normalizeVideoFilterKeyInput } from "./videoFilterKeyUtils";

/**
 * Pure payload helpers shared by the video API client. Kept free of axios and
 * Vite-specific imports so the PATCH contract can be unit-tested directly —
 * the post-completion metadata PATCH must never introduce a `filterKey`
 * property the caller did not pass (a `filterKey: null` there would clear the
 * key that the upload completion just persisted).
 */
export function cleanVideoFilterKey(value: unknown): string | undefined {
  return normalizeVideoFilterKeyInput(value) || undefined;
}

export function cleanUpdatePayload(
  payload: UpdateVideoPayload,
): UpdateVideoPayload {
  const hasFilterKey = Object.prototype.hasOwnProperty.call(
    payload,
    "filterKey",
  );
  const filterKey = cleanVideoFilterKey(payload.filterKey);

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
    ...(hasFilterKey ? { filterKey: filterKey ?? null } : {}),
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
