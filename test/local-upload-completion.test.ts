import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  completeLocalUploadWithRecovery,
  LocalUploadCompletionStateError,
  SubmissionLatch,
} from "../src/features/videos/localUploadCompletion";
import type {
  VideoAsset,
  VideoUploadSession,
  VideoUploadSessionStatus,
} from "../src/features/videos/videoTypes";

const conflict = Symbol("conflict");

function uploadStatus(status: VideoUploadSessionStatus): VideoUploadSession {
  return {
    id: "upload-1",
    status,
    totalBytes: 100,
    totalChunks: 1,
    chunkSizeBytes: 100,
    uploadedChunks: 1,
    uploadedChunkIndexes: [0],
    expiresAt: "2026-07-15T00:00:00.000Z",
  };
}

function completedVideo(): VideoAsset {
  return {
    id: "video-1",
    title: "Completed",
    slug: null,
    description: null,
    provider: "MANUAL",
    sourceType: "LOCAL_FILE",
    providerAssetId: null,
    playbackId: null,
    playbackUrl: null,
    embedUrl: null,
    thumbnailUrl: null,
    durationSeconds: 1,
    viewCount: 0,
    publishedAt: null,
    status: "READY",
    metadataJson: null,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  };
}

describe("local upload completion recovery", () => {
  it("reconciles 409 through bounded COMPLETING polling and uses completed result", async () => {
    let completeCalls = 0;
    let statusCalls = 0;
    const statuses = ["COMPLETING", "COMPLETED"] as const;

    const result = await completeLocalUploadWithRecovery({
      uploadId: "upload-1",
      complete: async () => {
        completeCalls += 1;
        if (completeCalls === 1) throw conflict;
        return completedVideo();
      },
      getStatus: async () =>
        uploadStatus(statuses[statusCalls++] ?? "COMPLETED"),
      isConflict: (error) => error === conflict,
      wait: async () => undefined,
      maxStatusAttempts: 4,
    });

    assert.equal(result.id, "video-1");
    assert.equal(completeCalls, 2);
    assert.equal(statusCalls, 2);
  });

  it("retries completion once the server reports ACTIVE", async () => {
    let completeCalls = 0;

    const result = await completeLocalUploadWithRecovery({
      uploadId: "upload-1",
      complete: async () => {
        completeCalls += 1;
        if (completeCalls === 1) throw conflict;
        return completedVideo();
      },
      getStatus: async () => uploadStatus("ACTIVE"),
      isConflict: (error) => error === conflict,
      wait: async () => undefined,
    });

    assert.equal(result.id, "video-1");
    assert.equal(completeCalls, 2);
  });

  it("stops on FAILED and instructs cancel/re-init", async () => {
    await assert.rejects(
      completeLocalUploadWithRecovery({
        uploadId: "upload-1",
        complete: async () => {
          throw conflict;
        },
        getStatus: async () => uploadStatus("FAILED"),
        isConflict: (error) => error === conflict,
        wait: async () => undefined,
      }),
      (error: unknown) =>
        error instanceof LocalUploadCompletionStateError &&
        error.uploadStatus === "FAILED" &&
        error.message.includes("hủy phiên upload"),
    );
  });

  it("caps COMPLETING polling attempts", async () => {
    let statusCalls = 0;

    await assert.rejects(
      completeLocalUploadWithRecovery({
        uploadId: "upload-1",
        complete: async () => {
          throw conflict;
        },
        getStatus: async () => {
          statusCalls += 1;
          return uploadStatus("COMPLETING");
        },
        isConflict: (error) => error === conflict,
        wait: async () => undefined,
        maxStatusAttempts: 3,
      }),
      (error: unknown) =>
        error instanceof LocalUploadCompletionStateError &&
        error.uploadStatus === "TIMEOUT",
    );

    assert.equal(statusCalls, 3);
  });

  it("stops reconciliation when the owning modal aborts polling", async () => {
    const controller = new AbortController();
    let statusCalls = 0;

    await assert.rejects(
      completeLocalUploadWithRecovery({
        uploadId: "upload-1",
        complete: async () => {
          throw conflict;
        },
        getStatus: async () => {
          statusCalls += 1;
          return uploadStatus("COMPLETING");
        },
        isConflict: (error) => error === conflict,
        signal: controller.signal,
        wait: async (_milliseconds, signal) => {
          controller.abort();
          assert.equal(signal?.aborted, true);
        },
      }),
      (error: unknown) =>
        error instanceof DOMException && error.name === "AbortError",
    );

    assert.equal(statusCalls, 1);
  });

  it("prevents duplicate completion from double submit", () => {
    const latch = new SubmissionLatch();

    assert.equal(latch.tryStart(), true);
    assert.equal(latch.tryStart(), false);
    latch.finish();
    assert.equal(latch.tryStart(), true);
  });
});
