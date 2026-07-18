import type {
  VideoAsset,
  VideoUploadSession,
  VideoUploadSessionStatus,
} from "./videoTypes";

const DEFAULT_MAX_STATUS_ATTEMPTS = 20;
const DEFAULT_POLL_INTERVAL_MS = 1_500;

export class LocalUploadCompletionStateError extends Error {
  constructor(
    readonly uploadId: string,
    readonly uploadStatus: VideoUploadSessionStatus | "TIMEOUT",
    message: string,
  ) {
    super(message);
    this.name = "LocalUploadCompletionStateError";
  }
}

export class SubmissionLatch {
  private active = false;

  tryStart(): boolean {
    if (this.active) {
      return false;
    }

    this.active = true;
    return true;
  }

  finish(): void {
    this.active = false;
  }
}

type CompletionDependencies = {
  uploadId: string;
  complete: () => Promise<VideoAsset>;
  getStatus: () => Promise<VideoUploadSession>;
  isConflict: (error: unknown) => boolean;
  signal?: AbortSignal;
  maxStatusAttempts?: number;
  pollIntervalMs?: number;
  wait?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  onStatus?: (status: VideoUploadSession) => void;
};

export async function completeLocalUploadWithRecovery(
  dependencies: CompletionDependencies,
): Promise<VideoAsset> {
  try {
    return await dependencies.complete();
  } catch (error) {
    if (!dependencies.isConflict(error)) {
      throw error;
    }
  }

  const maxStatusAttempts = Math.max(
    1,
    dependencies.maxStatusAttempts ?? DEFAULT_MAX_STATUS_ATTEMPTS,
  );
  const pollIntervalMs = Math.max(
    100,
    dependencies.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
  );
  const wait = dependencies.wait ?? waitForPoll;

  for (let attempt = 0; attempt < maxStatusAttempts; attempt += 1) {
    throwIfAborted(dependencies.signal);
    const upload = await dependencies.getStatus();
    dependencies.onStatus?.(upload);

    if (upload.status === "COMPLETED") {
      return dependencies.complete();
    }

    if (upload.status === "ACTIVE") {
      try {
        return await dependencies.complete();
      } catch (error) {
        if (!dependencies.isConflict(error)) {
          throw error;
        }
      }
    } else if (upload.status === "FAILED") {
      throw new LocalUploadCompletionStateError(
        dependencies.uploadId,
        upload.status,
        "Máy chủ không thể hoàn tất upload. Hãy hủy phiên upload rồi khởi tạo lại; file sẽ không tự động được upload lại.",
      );
    } else if (upload.status === "ABORTED") {
      throw new LocalUploadCompletionStateError(
        dependencies.uploadId,
        upload.status,
        "Phiên upload đã bị hủy.",
      );
    } else if (upload.status === "EXPIRED") {
      throw new LocalUploadCompletionStateError(
        dependencies.uploadId,
        upload.status,
        "Phiên upload đã hết hạn. Hãy khởi tạo upload mới.",
      );
    }

    if (attempt + 1 < maxStatusAttempts) {
      await wait(pollIntervalMs, dependencies.signal);
    }
  }

  throw new LocalUploadCompletionStateError(
    dependencies.uploadId,
    "TIMEOUT",
    "Upload vẫn đang được máy chủ xử lý. Hãy kiểm tra lại trạng thái trước khi thử hoàn tất lần nữa.",
  );
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException("Upload canceled.", "AbortError");
  }
}

function waitForPoll(
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const handleAbort = () => {
      globalThis.clearTimeout(timeout);
      reject(new DOMException("Upload canceled.", "AbortError"));
    };
    const timeout = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}
