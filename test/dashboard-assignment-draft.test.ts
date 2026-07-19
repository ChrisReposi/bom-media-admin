import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canToggleDraftAssignment,
  calculateAssignmentDelta,
  createAssignmentIdSet,
  mergeAssignmentOptions,
  rebaseAssignmentDraft,
  toggleDraftAssignment,
} from "../src/features/dashboard/dashboardAssignmentDraft";
import type { WebsiteVideoAssignmentOption } from "../src/features/websites/websiteTypes";

function option(videoId: string): WebsiteVideoAssignmentOption {
  return {
    video: { id: videoId } as WebsiteVideoAssignmentOption["video"],
    isAssigned: false,
    assignmentStatus: null,
    canAssign: true,
    canUnassign: false,
    blockedReason: null,
  };
}

describe("dashboard website assignment draft", () => {
  it("allows both assignment directions to be undone before save", () => {
    assert.equal(
      canToggleDraftAssignment({
        wasAssigned: false,
        isChecked: true,
        canAssign: true,
        canUnassign: false,
      }),
      true,
    );
    assert.equal(
      canToggleDraftAssignment({
        wasAssigned: true,
        isChecked: false,
        canAssign: false,
        canUnassign: true,
      }),
      true,
    );
    assert.equal(
      canToggleDraftAssignment({
        wasAssigned: false,
        isChecked: false,
        canAssign: false,
        canUnassign: false,
      }),
      false,
    );
  });

  it("prechecks authoritative active assignments independently of share selection", () => {
    const baselineAssignedIds = createAssignmentIdSet([
      "assigned-a",
      "assigned-on-another-page",
    ]);
    const draftAssignedIds = createAssignmentIdSet(baselineAssignedIds);

    assert.equal(draftAssignedIds.has("assigned-a"), true);
    assert.equal(draftAssignedIds.has("assigned-on-another-page"), true);
    assert.deepEqual(
      calculateAssignmentDelta(baselineAssignedIds, draftAssignedIds),
      { assignVideoIds: [], unassignVideoIds: [] },
    );
  });

  it("computes multiple assign and unassign deltas without changing the baseline", () => {
    const baseline = createAssignmentIdSet(["assigned-a", "assigned-b"]);
    let draft = createAssignmentIdSet(baseline);
    draft = toggleDraftAssignment(draft, "assigned-a");
    draft = toggleDraftAssignment(draft, "candidate-c");
    draft = toggleDraftAssignment(draft, "candidate-d");

    assert.deepEqual(calculateAssignmentDelta(baseline, draft), {
      assignVideoIds: ["candidate-c", "candidate-d"],
      unassignVideoIds: ["assigned-a"],
    });
    assert.deepEqual([...baseline], ["assigned-a", "assigned-b"]);
  });

  it("keeps draft selections while search and pagination options change", () => {
    const baseline = createAssignmentIdSet(["assigned-a"]);
    const draft = toggleDraftAssignment(baseline, "candidate-hidden");
    const merged = mergeAssignmentOptions(
      [option("first-page")],
      [option("second-page")],
    );

    assert.deepEqual(
      merged.map((item) => item.video.id),
      ["first-page", "second-page"],
    );
    assert.equal(draft.has("candidate-hidden"), true);
  });

  it("rebases after a stale invalid item without discarding valid user deltas", () => {
    const rebased = rebaseAssignmentDraft({
      baselineAssignedIds: createAssignmentIdSet(["assigned-a"]),
      draftAssignedIds: createAssignmentIdSet([
        "candidate-valid",
        "candidate-invalid",
      ]),
      nextBaselineAssignedIds: ["assigned-a", "externally-assigned"],
      invalidVideoIds: ["candidate-invalid"],
    });

    assert.deepEqual(
      [...rebased.baselineAssignedIds],
      ["assigned-a", "externally-assigned"],
    );
    assert.deepEqual(
      [...rebased.draftAssignedIds],
      ["externally-assigned", "candidate-valid"],
    );
    assert.deepEqual(
      calculateAssignmentDelta(
        rebased.baselineAssignedIds,
        rebased.draftAssignedIds,
      ),
      {
        assignVideoIds: ["candidate-valid"],
        unassignVideoIds: ["assigned-a"],
      },
    );
  });
});
