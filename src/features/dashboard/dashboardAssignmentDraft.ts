import type { WebsiteVideoAssignmentOption } from "@/features/websites/websiteTypes";

export type WebsiteVideoAssignmentDelta = {
  assignVideoIds: string[];
  unassignVideoIds: string[];
};

export function createAssignmentIdSet(
  videoIds: readonly string[],
): Set<string> {
  return new Set(videoIds);
}

export function toggleDraftAssignment(
  current: ReadonlySet<string>,
  videoId: string,
): Set<string> {
  const next = new Set(current);
  if (next.has(videoId)) next.delete(videoId);
  else next.add(videoId);
  return next;
}

export function canToggleDraftAssignment(input: {
  wasAssigned: boolean;
  isChecked: boolean;
  canAssign: boolean;
  canUnassign: boolean;
}): boolean {
  if (input.wasAssigned !== input.isChecked) {
    return true;
  }

  return input.wasAssigned ? input.canUnassign : input.canAssign;
}

export function calculateAssignmentDelta(
  baselineAssignedIds: ReadonlySet<string>,
  draftAssignedIds: ReadonlySet<string>,
): WebsiteVideoAssignmentDelta {
  return {
    assignVideoIds: [...draftAssignedIds].filter(
      (videoId) => !baselineAssignedIds.has(videoId),
    ),
    unassignVideoIds: [...baselineAssignedIds].filter(
      (videoId) => !draftAssignedIds.has(videoId),
    ),
  };
}

export function rebaseAssignmentDraft(input: {
  baselineAssignedIds: ReadonlySet<string>;
  draftAssignedIds: ReadonlySet<string>;
  nextBaselineAssignedIds: readonly string[];
  invalidVideoIds?: readonly string[];
}): { baselineAssignedIds: Set<string>; draftAssignedIds: Set<string> } {
  const invalidIds = new Set(input.invalidVideoIds ?? []);
  const delta = calculateAssignmentDelta(
    input.baselineAssignedIds,
    input.draftAssignedIds,
  );
  const baselineAssignedIds = new Set(input.nextBaselineAssignedIds);
  const draftAssignedIds = new Set(baselineAssignedIds);

  for (const videoId of delta.assignVideoIds) {
    if (!invalidIds.has(videoId)) draftAssignedIds.add(videoId);
  }
  for (const videoId of delta.unassignVideoIds) {
    if (!invalidIds.has(videoId)) draftAssignedIds.delete(videoId);
  }

  return { baselineAssignedIds, draftAssignedIds };
}

export function mergeAssignmentOptions(
  current: readonly WebsiteVideoAssignmentOption[],
  next: readonly WebsiteVideoAssignmentOption[],
): WebsiteVideoAssignmentOption[] {
  const byVideoId = new Map(
    current.map((option) => [option.video.id, option] as const),
  );
  for (const option of next) byVideoId.set(option.video.id, option);
  return [...byVideoId.values()];
}
