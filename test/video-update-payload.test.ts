import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cleanUpdatePayload,
  cleanVideoFilterKey,
} from "../src/features/videos/videoUpdatePayload";

describe("video update payload contract", () => {
  it("keeps filterKey absent in the post-completion metadata PATCH", () => {
    // Regression for the filterKey-loss incident: uploadLocalVideo PATCHes
    // durationSeconds/thumbnailUrl right after completion. That payload has
    // no filterKey property, and the cleaned payload must not invent one —
    // filterKey: null would tell the backend to clear the key the completion
    // just stored.
    const patch = cleanUpdatePayload({ durationSeconds: 42 });

    assert.deepEqual(patch, { durationSeconds: 42 });
    assert.equal(
      Object.prototype.hasOwnProperty.call(patch, "filterKey"),
      false,
    );

    const withThumbnail = cleanUpdatePayload({
      durationSeconds: 42,
      thumbnailUrl: "https://example.com/t.jpg",
    });
    assert.equal(
      Object.prototype.hasOwnProperty.call(withThumbnail, "filterKey"),
      false,
    );
  });

  it("normalizes an explicitly provided filterKey", () => {
    assert.deepEqual(cleanUpdatePayload({ filterKey: "SML" }), {
      filterKey: "sml",
    });
    assert.deepEqual(cleanUpdatePayload({ filterKey: "Judge Judy" }), {
      filterKey: "judge_judy",
    });
  });

  it("sends null when the caller explicitly clears the key", () => {
    assert.deepEqual(cleanUpdatePayload({ filterKey: "" }), {
      filterKey: null,
    });
    assert.deepEqual(cleanUpdatePayload({ filterKey: null }), {
      filterKey: null,
    });
  });

  it("cleanVideoFilterKey maps empty input to undefined and normalizes text", () => {
    assert.equal(cleanVideoFilterKey(""), undefined);
    assert.equal(cleanVideoFilterKey("   "), undefined);
    assert.equal(cleanVideoFilterKey(null), undefined);
    assert.equal(cleanVideoFilterKey("judge-judy"), "judge_judy");
  });
});
