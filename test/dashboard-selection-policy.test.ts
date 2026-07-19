import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_VIDEO_SELECTION_MODE,
  applyVideoSelection,
  reconcileSelectionForMode,
} from "../src/features/dashboard/dashboardSelectionPolicy";

describe("dashboard video selection policy", () => {
  it("defaults to the approved single-video canonical flow", () => {
    assert.equal(DEFAULT_VIDEO_SELECTION_MODE, "single");
  });

  it("multiple mode keeps the existing toggle behavior and selection order", () => {
    let selection: string[] = [];
    selection = applyVideoSelection("multiple", selection, "a");
    selection = applyVideoSelection("multiple", selection, "b");
    selection = applyVideoSelection("multiple", selection, "c");
    assert.deepEqual(selection, ["a", "b", "c"]);

    selection = applyVideoSelection("multiple", selection, "b");
    assert.deepEqual(selection, ["a", "c"]);

    selection = applyVideoSelection("multiple", selection, "b");
    assert.deepEqual(selection, ["a", "c", "b"]);
  });

  it("single mode holds at most one id and replaces on a new pick", () => {
    let selection = applyVideoSelection("single", [], "a");
    assert.deepEqual(selection, ["a"]);

    selection = applyVideoSelection("single", selection, "b");
    assert.deepEqual(selection, ["b"]);
  });

  it("single mode deselects when the current video is picked again", () => {
    const selection = applyVideoSelection("single", ["a"], "a");
    assert.deepEqual(selection, []);
  });

  it("single mode replaces even a multi-item selection left over from a mode switch race", () => {
    const selection = applyVideoSelection("single", ["a", "b"], "c");
    assert.deepEqual(selection, ["c"]);
  });

  it("switching multiple -> single keeps zero or one selection untouched", () => {
    assert.deepEqual(reconcileSelectionForMode("single", []), []);
    assert.deepEqual(reconcileSelectionForMode("single", ["a"]), ["a"]);
  });

  it("switching multiple -> single keeps only the most recent pick", () => {
    assert.deepEqual(reconcileSelectionForMode("single", ["a", "b", "c"]), [
      "c",
    ]);
  });

  it("switching single -> multiple keeps the current selection", () => {
    assert.deepEqual(reconcileSelectionForMode("multiple", ["a"]), ["a"]);
    assert.deepEqual(reconcileSelectionForMode("multiple", []), []);
  });

  it("keeps at most one id after assignment-error reconciliation in single mode", () => {
    // Simulates: assignment policy removed invalid ids, then the mode
    // reconcile runs on the survivor list.
    const survivors = ["x", "y"];
    assert.deepEqual(reconcileSelectionForMode("single", survivors), ["y"]);
  });

  it("does not mutate the input selection array", () => {
    const input = ["a", "b"];
    applyVideoSelection("multiple", input, "c");
    applyVideoSelection("single", input, "c");
    reconcileSelectionForMode("single", input);
    assert.deepEqual(input, ["a", "b"]);
  });
});
