export type VideoSelectionMode = "single" | "multiple";

export const DEFAULT_VIDEO_SELECTION_MODE: VideoSelectionMode = "single";

/**
 * Pure selection policy for the dashboard video picker. The selection array
 * preserves selection order (new picks append at the end), which is what makes
 * "keep the most recent pick" deterministic when collapsing to single mode.
 */
export function applyVideoSelection(
  mode: VideoSelectionMode,
  currentVideoIds: readonly string[],
  videoId: string,
): string[] {
  if (mode === "single") {
    return currentVideoIds[0] === videoId ? [] : [videoId];
  }

  return currentVideoIds.includes(videoId)
    ? currentVideoIds.filter((currentVideoId) => currentVideoId !== videoId)
    : [...currentVideoIds, videoId];
}

/**
 * Applied when the admin switches mode and after assignment-error
 * reconciliation. Never issues a request; only trims local state.
 */
export function reconcileSelectionForMode(
  mode: VideoSelectionMode,
  currentVideoIds: readonly string[],
): string[] {
  if (mode === "single" && currentVideoIds.length > 1) {
    return [currentVideoIds[currentVideoIds.length - 1]];
  }

  return [...currentVideoIds];
}
