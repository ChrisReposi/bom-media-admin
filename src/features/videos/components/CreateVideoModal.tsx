import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Code2,
  FileVideo,
  ImageOff,
  ImagePlus,
  Link2,
  Loader2,
  Server,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FocusEvent,
} from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isApiRequestCanceled } from "@/lib/api/apiError";
import { cn } from "@/lib/utils";

import {
  cancelLocalVideoUpload,
  createVideoEmbed,
  createVideoEmbedWithThumbnail,
  createVideoManual,
  createVideoManualWithThumbnail,
  getApiErrorMessage,
  uploadLocalVideo,
} from "../videoApi";
import {
  getDefaultThumbnailUrlFromPlaybackUrl,
  probeVideoMetadata,
} from "../cloudinaryVideoUtils";
import {
  formatAdminPublishedAtInput,
  formatAdminPublishedAtTypingValue,
  normalizeAdminPublishedAtInput,
  parseAdminPublishedAtInput,
} from "../videoDateUtils";
import { extractIframeSrc, isSafePreviewEmbedUrl } from "../videoEmbedUtils";
import { normalizeVideoFilterKeyInput } from "../videoFilterKeyUtils";
import { createVideoSchema, type CreateVideoFormValues } from "../videoSchemas";
import {
  VIDEO_STATUS_OPTIONS,
  type UploadLocalVideoProgress,
  type VideoStatus,
} from "../videoTypes";

type CreateVideoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

type CreateVideoMode = CreateVideoFormValues["mode"];

type SourceConfirmState =
  | "idle"
  | "dirty"
  | "confirming"
  | "confirmed"
  | "partial"
  | "failed";

type SourceMetadata = {
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  thumbnailObjectUrl: string | null;
  thumbnailFile: File | null;
  width: number | null;
  height: number | null;
  providerNote: string | null;
  durationSource: "auto" | "manual" | null;
  thumbnailSource: "auto" | "manual-url" | "manual-file" | null;
};

type CapturedThumbnail = {
  objectUrl: string;
  file: File;
  width: number;
  height: number;
};

const createVideoResolver = zodResolver(
  createVideoSchema as unknown as Parameters<typeof zodResolver>[0],
) as unknown as Resolver<CreateVideoFormValues>;

const defaultValues: CreateVideoFormValues = {
  mode: "local-upload",
  title: "",
  description: "",
  filterKey: "",
  playbackUrl: "",
  embedCodeOrUrl: "",
  thumbnailUrl: "",
  durationSeconds: undefined,
  viewCount: undefined,
  publishedAt: "",
  status: "READY",
  file: undefined,
};

const statusLabels: Record<VideoStatus, string> = {
  DISABLED: "Đã tắt",
  DRAFT: "Nháp",
  FAILED: "Lỗi",
  PROCESSING: "Đang xử lý",
  READY: "Sẵn sàng",
};

function createEmptySourceMetadata(): SourceMetadata {
  return {
    durationSeconds: null,
    thumbnailUrl: null,
    thumbnailObjectUrl: null,
    thumbnailFile: null,
    width: null,
    height: null,
    providerNote: null,
    durationSource: null,
    thumbnailSource: null,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-(--admin-danger)">{message}</p>;
}

const adminSelectOptionStyle: CSSProperties = {
  backgroundColor: "var(--admin-input-bg)",
  color: "var(--admin-text-strong)",
};

function selectClass(hasError: boolean): string {
  return cn(
    "h-10 w-full rounded-md border px-3 text-sm shadow-sm outline-none transition-colors",
    "border-[var(--admin-border)] bg-[var(--admin-input-bg)] text-[var(--admin-text-strong)]",
    "hover:border-[var(--admin-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--admin-focus-ring)]",
    "disabled:cursor-not-allowed disabled:opacity-60",
    hasError && "border-[var(--admin-danger)] focus-visible:ring-red-100",
  );
}

function fieldClass(hasError: boolean): string {
  return cn(
    "h-10 border-[var(--admin-border)] bg-[var(--admin-input-bg)] text-[var(--admin-text-strong)]",
    "placeholder:text-[var(--admin-text-muted)] focus-visible:ring-[var(--admin-focus-ring)]",
    hasError && "border-[var(--admin-danger)] focus-visible:ring-red-100",
  );
}

function formatFileSize(file: File): string {
  const megabytes = file.size / 1024 / 1024;

  if (megabytes >= 1) {
    return `${megabytes.toFixed(megabytes >= 10 ? 1 : 2)} MB`;
  }

  return `${Math.max(1, Math.round(file.size / 1024))} KB`;
}

function getNumericValue(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getPersistableThumbnailUrl(value?: string): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed || !isHttpUrl(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function buildSourceKey(
  mode: CreateVideoMode,
  playbackUrl: string,
  embedCodeOrUrl: string,
  selectedFile: File | null,
): string {
  if (mode === "manual") {
    return playbackUrl.trim() ? `manual:${playbackUrl.trim()}` : "";
  }

  if (mode === "embed") {
    return embedCodeOrUrl.trim() ? `embed:${embedCodeOrUrl.trim()}` : "";
  }

  if (selectedFile) {
    return `${mode}:${selectedFile.name}:${selectedFile.size}:${selectedFile.lastModified}`;
  }

  return "";
}

function getConfirmButtonLabel(mode: CreateVideoMode): string {
  if (mode === "manual") {
    return "Xác nhận nguồn video";
  }

  if (mode === "embed") {
    return "Xác nhận embed";
  }

  return "Xác nhận file";
}

function getSourceStatusMessage(state: SourceConfirmState): string | null {
  if (state === "dirty") {
    return "Nguồn đã thay đổi. Vui lòng xác nhận lại trước khi tạo video.";
  }

  if (state === "confirming") {
    return "Đang phân tích video...";
  }

  if (state === "confirmed") {
    return "Nguồn video đã được xác nhận.";
  }

  if (state === "partial") {
    return "Nguồn đã được xác nhận một phần. Bổ sung metadata thủ công nếu cần.";
  }

  if (state === "failed") {
    return "Không xác nhận được nguồn. Kiểm tra lại URL hoặc file.";
  }

  return null;
}

function getSourceStatusClass(state: SourceConfirmState): string {
  if (state === "failed") {
    return "border-[var(--admin-danger)] bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]";
  }

  if (state === "partial" || state === "dirty") {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
  }

  if (state === "confirmed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  }

  return "border-(--admin-border) bg-(--admin-surface-alt) text-(--admin-text)";
}

function buildPlayerEmbedThumbnailUrl(embedUrl: string): string | null {
  try {
    const url = new URL(embedUrl);
    const cloudName = url.searchParams.get("cloud_name")?.trim();
    const publicId = url.searchParams.get("public_id")?.trim();

    if (!cloudName || !publicId) {
      return null;
    }

    const encodedPublicId = publicId
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `https://res.cloudinary.com/${encodeURIComponent(
      cloudName,
    )}/video/upload/so_1,w_640,c_fill,q_auto/${encodedPublicId}.jpg`;
  } catch {
    return null;
  }
}

function extractYouTubeVideoId(embedUrl: string): string | null {
  try {
    const url = new URL(embedUrl);
    const host = url.hostname.toLowerCase();

    if (host !== "www.youtube.com" && host !== "www.youtube-nocookie.com") {
      return null;
    }

    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/").filter(Boolean)[1] ?? null;
    }

    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/").filter(Boolean)[1] ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

function getEmbedThumbnailCandidate(embedUrl: string): {
  thumbnailUrl: string | null;
  note: string | null;
} {
  try {
    const url = new URL(embedUrl);
    const host = url.hostname.toLowerCase();

    if (host === "player.cloudinary.com") {
      const thumbnailUrl = buildPlayerEmbedThumbnailUrl(embedUrl);
      return {
        thumbnailUrl,
        note: thumbnailUrl
          ? "Thumbnail tự động từ provider embed"
          : "Provider embed không đủ metadata để tạo thumbnail.",
      };
    }

    const youtubeVideoId = extractYouTubeVideoId(embedUrl);
    if (youtubeVideoId) {
      return {
        thumbnailUrl: `https://img.youtube.com/vi/${encodeURIComponent(
          youtubeVideoId,
        )}/hqdefault.jpg`,
        note: "Thumbnail tự động từ YouTube",
      };
    }

    if (host === "player.vimeo.com") {
      return {
        thumbnailUrl: null,
        note: "Vimeo cần provider API để lấy thumbnail tự động.",
      };
    }

    return {
      thumbnailUrl: null,
      note: "Không có thumbnail tự động cho provider này.",
    };
  } catch {
    return {
      thumbnailUrl: null,
      note: null,
    };
  }
}

function resolveThumbnailFilename(sourceName: string): string {
  const base = sourceName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "video"}-thumbnail.jpg`;
}

function captureVideoFrameThumbnail(
  sourceUrl: string,
  fileName: string,
  createObjectUrl: (blob: Blob) => string,
): Promise<CapturedThumbnail | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;

    function cleanup(): void {
      window.clearTimeout(timeoutId);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleFailure);
      video.removeAttribute("src");
      video.load();
    }

    function resolveOnce(value: CapturedThumbnail | null): void {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(value);
    }

    function drawFrame(): void {
      try {
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (!width || !height) {
          resolveOnce(null);
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          resolveOnce(null);
          return;
        }

        context.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolveOnce(null);
              return;
            }

            const file = new File([blob], fileName, { type: "image/jpeg" });
            resolveOnce({
              objectUrl: createObjectUrl(file),
              file,
              width,
              height,
            });
          },
          "image/jpeg",
          0.86,
        );
      } catch {
        resolveOnce(null);
      }
    }

    function handleLoadedMetadata(): void {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const captureSecond = duration > 2 ? Math.min(1, duration / 4) : 0;

      if (captureSecond > 0) {
        try {
          video.currentTime = captureSecond;
        } catch {
          drawFrame();
        }
        return;
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        drawFrame();
      }
    }

    function handleLoadedData(): void {
      if (video.currentTime === 0) {
        drawFrame();
      }
    }

    function handleSeeked(): void {
      drawFrame();
    }

    function handleFailure(): void {
      resolveOnce(null);
    }

    const timeoutId = window.setTimeout(handleFailure, 7000);

    video.preload = "metadata";
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleFailure);
    video.src = sourceUrl;
    video.load();
  });
}

export function CreateVideoModal({
  open,
  onOpenChange,
  onCreated,
}: CreateVideoModalProps) {
  const [sourceConfirmState, setSourceConfirmState] =
    useState<SourceConfirmState>("idle");
  const [sourceMetadata, setSourceMetadata] = useState<SourceMetadata>(() =>
    createEmptySourceMetadata(),
  );
  const [confirmedSourceKey, setConfirmedSourceKey] = useState("");
  const [showManualDuration, setShowManualDuration] = useState(false);
  const [showManualThumbnail, setShowManualThumbnail] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [localUploadProgress, setLocalUploadProgress] =
    useState<UploadLocalVideoProgress | null>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const previousSourceKeyRef = useRef("");
  const localUploadAbortControllerRef = useRef<AbortController | null>(null);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<CreateVideoFormValues>({
    resolver: createVideoResolver,
    defaultValues,
    mode: "onBlur",
  });

  const mode = watch("mode");
  const playbackUrl = watch("playbackUrl")?.trim() ?? "";
  const embedCodeOrUrl = watch("embedCodeOrUrl")?.trim() ?? "";
  const thumbnailUrl = watch("thumbnailUrl")?.trim() ?? "";
  const selectedFile = watch("file")?.item(0) ?? null;
  const durationSeconds = watch("durationSeconds");
  const sourceKey = useMemo(
    () => buildSourceKey(mode, playbackUrl, embedCodeOrUrl, selectedFile),
    [embedCodeOrUrl, mode, playbackUrl, selectedFile],
  );
  const isCurrentSourceConfirmed =
    sourceKey !== "" &&
    confirmedSourceKey === sourceKey &&
    (sourceConfirmState === "confirmed" || sourceConfirmState === "partial");
  const sourceStatusMessage = getSourceStatusMessage(sourceConfirmState);
  const thumbnailPreviewUrl =
    thumbnailUrl || sourceMetadata.thumbnailObjectUrl || null;
  const confirmedEmbedPreviewUrl = isCurrentSourceConfirmed
    ? extractIframeSrc(embedCodeOrUrl)
    : null;
  const isLocalUploadSubmitting =
    localUploadProgress !== null &&
    (localUploadProgress.phase === "init" ||
      localUploadProgress.phase === "uploading" ||
      localUploadProgress.phase === "complete" ||
      localUploadProgress.phase === "canceling");
  const isBusy = isSubmitting || isLocalUploadSubmitting;

  function handlePublishedAtBlur(event: FocusEvent<HTMLInputElement>): void {
    const formattedValue = formatAdminPublishedAtTypingValue(
      event.target.value,
    );

    if (formattedValue !== event.target.value) {
      setValue("publishedAt", formattedValue, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  const publishedAtField = register("publishedAt", {
    onBlur: handlePublishedAtBlur,
  });

  function handleFilterKeyBlur(event: FocusEvent<HTMLInputElement>): void {
    const normalizedValue = normalizeVideoFilterKeyInput(event.target.value);

    if (normalizedValue !== event.target.value) {
      setValue("filterKey", normalizedValue, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  const filterKeyField = register("filterKey", {
    onBlur: handleFilterKeyBlur,
  });

  function createPreviewObjectUrl(blob: Blob): string {
    const objectUrl = URL.createObjectURL(blob);
    objectUrlsRef.current.add(objectUrl);
    return objectUrl;
  }

  function revokeAllPreviewObjectUrls(): void {
    for (const objectUrl of objectUrlsRef.current) {
      URL.revokeObjectURL(objectUrl);
    }

    objectUrlsRef.current.clear();
  }

  function resetSourceConfirmation(nextState: SourceConfirmState = "idle") {
    revokeAllPreviewObjectUrls();
    setSourceMetadata(createEmptySourceMetadata());
    setConfirmedSourceKey("");
    setSourceConfirmState(nextState);
    setShowManualDuration(false);
    setShowManualThumbnail(false);
    setThumbnailFailed(false);
    setLocalUploadProgress(null);
    setValue("durationSeconds", undefined, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("thumbnailUrl", "", {
      shouldDirty: true,
      shouldValidate: false,
    });
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !isBusy) {
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isBusy, onOpenChange, open]);

  useEffect(() => {
    if (!open) {
      reset(defaultValues);
      previousSourceKeyRef.current = "";
      resetSourceConfirmation("idle");
    }
  }, [open, reset]);

  useEffect(() => {
    setThumbnailFailed(false);
  }, [thumbnailPreviewUrl]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (sourceKey === previousSourceKeyRef.current) {
      return;
    }

    previousSourceKeyRef.current = sourceKey;
    resetSourceConfirmation(sourceKey ? "dirty" : "idle");
  }, [open, sourceKey]);

  useEffect(() => {
    return () => {
      revokeAllPreviewObjectUrls();
    };
  }, []);

  async function confirmManualSource(): Promise<SourceMetadata> {
    if (!playbackUrl) {
      throw new Error("Vui lòng nhập Playback URL trước.");
    }

    if (!isHttpUrl(playbackUrl)) {
      throw new Error("Playback URL phải là http hoặc https.");
    }

    const metadata = await probeVideoMetadata(playbackUrl);
    const cloudinaryThumbnailUrl =
      getDefaultThumbnailUrlFromPlaybackUrl(playbackUrl);
    let capturedThumbnail: CapturedThumbnail | null = null;

    if (!cloudinaryThumbnailUrl) {
      capturedThumbnail = await captureVideoFrameThumbnail(
        playbackUrl,
        "remote-video-thumbnail.jpg",
        createPreviewObjectUrl,
      );
    }

    return {
      durationSeconds: metadata.durationSeconds,
      thumbnailUrl: cloudinaryThumbnailUrl,
      thumbnailObjectUrl: capturedThumbnail?.objectUrl ?? null,
      thumbnailFile: capturedThumbnail?.file ?? null,
      width: metadata.width ?? capturedThumbnail?.width ?? null,
      height: metadata.height ?? capturedThumbnail?.height ?? null,
      providerNote: cloudinaryThumbnailUrl
        ? "Thumbnail tự động từ playback URL"
        : capturedThumbnail
          ? "Đã chụp frame. Thumbnail này sẽ được gửi lên backend để lưu theo cấu hình hiện tại."
          : "Không tìm thấy thumbnail tự động.",
      durationSource: metadata.durationSeconds === null ? null : "auto",
      thumbnailSource:
        cloudinaryThumbnailUrl || capturedThumbnail ? "auto" : null,
    };
  }

  async function confirmEmbedSource(): Promise<SourceMetadata> {
    const src = extractIframeSrc(embedCodeOrUrl);

    if (!src) {
      throw new Error("Vui lòng nhập embed code hoặc URL.");
    }

    if (!isSafePreviewEmbedUrl(src)) {
      throw new Error("Embed URL không thuộc provider được hỗ trợ.");
    }

    const thumbnailCandidate = getEmbedThumbnailCandidate(src);

    return {
      durationSeconds: null,
      thumbnailUrl: thumbnailCandidate.thumbnailUrl,
      thumbnailObjectUrl: null,
      thumbnailFile: null,
      width: null,
      height: null,
      providerNote:
        thumbnailCandidate.note ??
        "Embed provider chưa hỗ trợ metadata tự động.",
      durationSource: null,
      thumbnailSource: thumbnailCandidate.thumbnailUrl ? "auto" : null,
    };
  }

  async function confirmFileSource(file: File): Promise<SourceMetadata> {
    if (!file.type.startsWith("video/")) {
      throw new Error("File tải lên phải là video.");
    }

    const videoObjectUrl = URL.createObjectURL(file);

    try {
      const metadata = await probeVideoMetadata(videoObjectUrl, {
        timeoutMs: 5000,
      });
      const capturedThumbnail = await captureVideoFrameThumbnail(
        videoObjectUrl,
        resolveThumbnailFilename(file.name),
        createPreviewObjectUrl,
      );

      return {
        durationSeconds: metadata.durationSeconds,
        thumbnailUrl: null,
        thumbnailObjectUrl: capturedThumbnail?.objectUrl ?? null,
        thumbnailFile: capturedThumbnail?.file ?? null,
        width: metadata.width ?? capturedThumbnail?.width ?? null,
        height: metadata.height ?? capturedThumbnail?.height ?? null,
        providerNote: capturedThumbnail
          ? "Đã chụp frame. Thumbnail này sẽ lưu trên server storage khi tạo video."
          : "Không chụp được thumbnail tự động.",
        durationSource: metadata.durationSeconds === null ? null : "auto",
        thumbnailSource: capturedThumbnail ? "auto" : null,
      };
    } finally {
      URL.revokeObjectURL(videoObjectUrl);
    }
  }

  async function handleConfirmSource(): Promise<void> {
    if (!sourceKey) {
      toast.error("Vui lòng nhập hoặc chọn nguồn video trước.");
      return;
    }

    setSourceConfirmState("confirming");
    revokeAllPreviewObjectUrls();
    setThumbnailFailed(false);

    try {
      const metadata =
        mode === "manual"
          ? await confirmManualSource()
          : mode === "embed"
            ? await confirmEmbedSource()
            : selectedFile
              ? await confirmFileSource(selectedFile)
              : null;

      if (metadata === null) {
        throw new Error("Vui lòng chọn file video.");
      }

      setSourceMetadata(metadata);
      setConfirmedSourceKey(sourceKey);

      if (metadata.durationSeconds !== null) {
        setValue("durationSeconds", metadata.durationSeconds, {
          shouldDirty: true,
          shouldValidate: true,
        });
      } else {
        setValue("durationSeconds", undefined, {
          shouldDirty: true,
          shouldValidate: false,
        });
      }

      if (metadata.thumbnailUrl !== null) {
        setValue("thumbnailUrl", metadata.thumbnailUrl, {
          shouldDirty: true,
          shouldValidate: true,
        });
      } else {
        setValue("thumbnailUrl", "", {
          shouldDirty: true,
          shouldValidate: false,
        });
      }

      const needsManualDuration = metadata.durationSeconds === null;
      const needsManualThumbnail =
        metadata.thumbnailUrl === null && metadata.thumbnailFile === null;

      setShowManualDuration(needsManualDuration);
      setShowManualThumbnail(needsManualThumbnail);
      setSourceConfirmState(
        needsManualDuration || needsManualThumbnail ? "partial" : "confirmed",
      );

      if (needsManualDuration || needsManualThumbnail) {
        toast.warning("Đã xác nhận nguồn. Một vài metadata cần nhập thủ công.");
      } else {
        toast.success("Đã xác nhận nguồn video.");
      }
    } catch (error) {
      setSourceMetadata(createEmptySourceMetadata());
      setConfirmedSourceKey("");
      setShowManualDuration(false);
      setShowManualThumbnail(false);
      setSourceConfirmState("failed");
      toast.error(
        error instanceof Error ? error.message : "Xác nhận thất bại.",
      );
    }
  }

  function handleManualThumbnailFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const file = event.currentTarget.files?.item(0) ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Thumbnail phải là file ảnh.");
      event.currentTarget.value = "";
      return;
    }

    if (file.type === "image/svg+xml") {
      toast.error(
        "Không hỗ trợ SVG thumbnail. Vui lòng chọn JPG, PNG hoặc WebP.",
      );
      event.currentTarget.value = "";
      return;
    }

    revokeAllPreviewObjectUrls();
    const objectUrl = createPreviewObjectUrl(file);

    setThumbnailFailed(false);
    setSourceMetadata((current) => ({
      ...current,
      thumbnailUrl: null,
      thumbnailObjectUrl: objectUrl,
      thumbnailFile: file,
      providerNote:
        mode === "local-upload"
          ? "Ảnh thumbnail này sẽ lưu trên server storage khi tạo video."
          : "Ảnh thumbnail sẽ được gửi lên backend để lưu theo cấu hình hiện tại.",
      thumbnailSource: "manual-file",
    }));
    setValue("thumbnailUrl", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function handleCancelLocalUpload(): Promise<void> {
    const currentProgress = localUploadProgress;
    const uploadId = currentProgress?.uploadId;

    localUploadAbortControllerRef.current?.abort();

    if (!currentProgress) {
      return;
    }

    setLocalUploadProgress({
      ...currentProgress,
      phase: "canceling",
    });

    try {
      if (uploadId) {
        await cancelLocalVideoUpload(uploadId);
      }

      toast.info("Đã hủy upload server storage.");
    } catch {
      toast.warning(
        "Đã hủy upload trong trình duyệt. Không thể xác nhận cleanup trên server.",
      );
    } finally {
      localUploadAbortControllerRef.current = null;
      setLocalUploadProgress(null);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (!isCurrentSourceConfirmed) {
        toast.error("Vui lòng xác nhận nguồn video trước khi tạo.");
        return;
      }

      const normalizedPublishedAt = normalizeAdminPublishedAtInput(
        values.publishedAt ?? "",
      );
      const publishedAt = parseAdminPublishedAtInput(normalizedPublishedAt);

      if (values.publishedAt?.trim() && !publishedAt) {
        toast.error(
          "Thời gian xuất bản phải có dạng 17/03/1999 hoặc 17/03/1999, 10:41. Có thể nhập nhanh 17031999, 1041.",
        );
        return;
      }

      if (normalizedPublishedAt !== (values.publishedAt ?? "")) {
        setValue("publishedAt", normalizedPublishedAt, {
          shouldDirty: true,
          shouldValidate: false,
        });
      }

      const description = values.description?.trim() || undefined;
      const filterKey = normalizeVideoFilterKeyInput(values.filterKey ?? "");
      const viewCount =
        typeof values.viewCount === "number" ? values.viewCount : undefined;
      const durationSeconds = getNumericValue(values.durationSeconds);
      const thumbnailUrlValue = getPersistableThumbnailUrl(values.thumbnailUrl);
      const thumbnailFileValue = thumbnailUrlValue
        ? undefined
        : (sourceMetadata.thumbnailFile ?? undefined);
      const status = values.status;

      if (values.mode === "manual") {
        const payload = {
          title: values.title,
          playbackUrl: values.playbackUrl?.trim() ?? "",
          status,
          ...(description ? { description } : {}),
          ...(filterKey ? { filterKey } : {}),
          ...(thumbnailUrlValue ? { thumbnailUrl: thumbnailUrlValue } : {}),
          ...(thumbnailFileValue ? { thumbnailFile: thumbnailFileValue } : {}),
          ...(durationSeconds !== undefined ? { durationSeconds } : {}),
          ...(viewCount !== undefined ? { viewCount } : {}),
          ...(publishedAt ? { publishedAt } : {}),
        };

        if (payload.thumbnailFile) {
          await createVideoManualWithThumbnail(payload);
        } else {
          await createVideoManual(payload);
        }

        toast.success("Đã tạo video thủ công.");
      } else if (values.mode === "embed") {
        const payload = {
          title: values.title,
          embedCodeOrUrl: values.embedCodeOrUrl?.trim() ?? "",
          status,
          ...(description ? { description } : {}),
          ...(filterKey ? { filterKey } : {}),
          ...(thumbnailUrlValue ? { thumbnailUrl: thumbnailUrlValue } : {}),
          ...(thumbnailFileValue ? { thumbnailFile: thumbnailFileValue } : {}),
          ...(durationSeconds !== undefined ? { durationSeconds } : {}),
          ...(viewCount !== undefined ? { viewCount } : {}),
          ...(publishedAt ? { publishedAt } : {}),
        };

        if (payload.thumbnailFile) {
          await createVideoEmbedWithThumbnail(payload);
        } else {
          await createVideoEmbed(payload);
        }

        toast.success("Đã tạo video nhúng.");
      } else if (values.mode === "local-upload") {
        const file = values.file?.item(0);
        if (!file) {
          toast.error("Vui lòng chọn file video.");
          return;
        }

        const abortController = new AbortController();
        localUploadAbortControllerRef.current = abortController;

        await uploadLocalVideo(
          {
            title: values.title,
            file,
            status,
            ...(description ? { description } : {}),
            ...(filterKey ? { filterKey } : {}),
            ...(thumbnailUrlValue ? { thumbnailUrl: thumbnailUrlValue } : {}),
            ...(thumbnailFileValue
              ? { thumbnailFile: thumbnailFileValue }
              : {}),
            ...(durationSeconds !== undefined ? { durationSeconds } : {}),
            ...(viewCount !== undefined ? { viewCount } : {}),
            ...(publishedAt ? { publishedAt } : {}),
          },
          {
            signal: abortController.signal,
            onProgress: setLocalUploadProgress,
          },
        );

        localUploadAbortControllerRef.current = null;
        setLocalUploadProgress(null);
        toast.success("Đã tải video lên server storage.");
      } else {
        throw new Error("Unsupported create video mode.");
      }

      reset(defaultValues);
      resetSourceConfirmation("idle");
      previousSourceKeyRef.current = "";
      onOpenChange(false);
      onCreated();
    } catch (error) {
      localUploadAbortControllerRef.current = null;
      setLocalUploadProgress(null);

      if (isApiRequestCanceled(error)) {
        return;
      }

      toast.error(getApiErrorMessage(error));
    }
  });

  if (!open) {
    return null;
  }

  const canConfirmSource =
    sourceConfirmState !== "confirming" &&
    (mode === "manual"
      ? playbackUrl !== ""
      : mode === "embed"
        ? embedCodeOrUrl !== ""
        : selectedFile !== null);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/54 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onOpenChange(false);
        }
      }}
    >
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-(--admin-border) bg-(--admin-surface) shadow-(--admin-shadow-strong)">
        <div className="flex items-start justify-between gap-4 border-b border-(--admin-border) px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-(--admin-text-strong)">
              Thêm Video
            </h2>
            <p className="mt-1 text-sm text-(--admin-text)">
              Xác nhận nguồn trước, sau đó tạo video bằng metadata đã kiểm tra.
            </p>
          </div>

          <button
            aria-label="Đóng modal thêm video"
            className="flex size-9 items-center justify-center rounded-md text-(--admin-text) transition hover:bg-(--admin-surface-alt) hover:text-(--admin-text-strong)"
            disabled={isBusy}
            type="button"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <form className="space-y-5 px-5 py-5" noValidate onSubmit={onSubmit}>
          <div className="grid gap-2 rounded-lg bg-(--admin-surface-alt) p-1 sm:grid-cols-3">
            <button
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition",
                mode === "local-upload"
                  ? "bg-(--admin-surface) text-(--admin-primary) shadow-sm"
                  : "text-(--admin-text) hover:text-(--admin-text-strong)",
              )}
              disabled={isBusy}
              type="button"
              onClick={() => setValue("mode", "local-upload")}
            >
              <Server className="size-4" />
              Server
            </button>

            <button
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition",
                mode === "manual"
                  ? "bg-(--admin-surface) text-(--admin-primary) shadow-sm"
                  : "text-(--admin-text) hover:text-(--admin-text-strong)",
              )}
              disabled={isBusy}
              type="button"
              onClick={() => setValue("mode", "manual")}
            >
              <Link2 className="size-4" />
              Manual URL
            </button>

            <button
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition",
                mode === "embed"
                  ? "bg-(--admin-surface) text-(--admin-primary) shadow-sm"
                  : "text-(--admin-text) hover:text-(--admin-text-strong)",
              )}
              disabled={isBusy}
              type="button"
              onClick={() => setValue("mode", "embed")}
            >
              <Code2 className="size-4" />
              Embed Code
            </button>
          </div>

          {mode === "local-upload" ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              Preferred production path: video bytes and thumbnail files are
              stored in private server storage. MySQL stores metadata only.
            </p>
          ) : null}

          <input type="hidden" {...register("mode")} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                htmlFor="video-title"
              >
                Tiêu đề
              </label>
              <Input
                id="video-title"
                placeholder="Demo video"
                className={fieldClass(!!errors.title)}
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              <FieldError message={errors.title?.message} />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                htmlFor="video-status"
              >
                Trạng thái
              </label>
              <select
                id="video-status"
                className={selectClass(!!errors.status)}
                style={{
                  backgroundColor: "var(--admin-input-bg)",
                  color: "var(--admin-text-strong)",
                }}
                aria-invalid={!!errors.status}
                {...register("status")}
              >
                {VIDEO_STATUS_OPTIONS.map((status) => (
                  <option
                    key={status}
                    style={adminSelectOptionStyle}
                    value={status}
                  >
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
              <FieldError message={errors.status?.message} />
            </div>

            <div className="md:col-span-2">
              <label
                className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                htmlFor="video-description"
              >
                Mô tả
              </label>
              <textarea
                id="video-description"
                className={cn(
                  "min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none transition focus-visible:ring-2",
                  fieldClass(!!errors.description),
                )}
                placeholder="Ghi chú nội bộ hoặc mô tả ngắn"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              <FieldError message={errors.description?.message} />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                htmlFor="video-filter-key"
              >
                Key lọc video
              </label>
              <Input
                id="video-filter-key"
                className={fieldClass(!!errors.filterKey)}
                placeholder="sml, msa, judge_judy, coryxkenshin"
                aria-invalid={!!errors.filterKey}
                {...filterKeyField}
              />
              <p className="mt-2 text-xs text-(--admin-text-muted)">
                Dùng để lọc nhanh video theo chủ đề/kênh. Có thể bỏ trống.
              </p>
              <FieldError message={errors.filterKey?.message} />
            </div>

            <div className="md:col-span-2">
              <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface-alt) p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-(--admin-text-strong)">
                      Nguồn video
                    </h3>
                    <p className="mt-1 text-xs text-(--admin-text-muted)">
                      Confirm Source chỉ phân tích metadata, không tạo video.
                    </p>
                  </div>

                  <Button
                    disabled={!canConfirmSource || isBusy}
                    type="button"
                    variant="outline"
                    onClick={() => void handleConfirmSource()}
                  >
                    {sourceConfirmState === "confirming" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    {getConfirmButtonLabel(mode)}
                  </Button>
                </div>

                {mode === "manual" ? (
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                      htmlFor="playback-url"
                    >
                      Playback URL
                    </label>
                    <Input
                      id="playback-url"
                      placeholder="https://res.cloudinary.com/.../video/upload/demo.mp4"
                      className={fieldClass(!!errors.playbackUrl)}
                      aria-invalid={!!errors.playbackUrl}
                      {...register("playbackUrl")}
                    />
                    <FieldError message={errors.playbackUrl?.message} />
                  </div>
                ) : mode === "embed" ? (
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                      htmlFor="embed-code-or-url"
                    >
                      Embed code hoặc URL
                    </label>
                    <textarea
                      id="embed-code-or-url"
                      className={cn(
                        "min-h-28 w-full resize-y rounded-md border px-3 py-2 font-mono text-sm outline-none transition focus-visible:ring-2",
                        fieldClass(!!errors.embedCodeOrUrl),
                      )}
                      placeholder='<iframe src="https://player.cloudinary.com/embed/?cloud_name=dekft3yz7&public_id=demo"></iframe>'
                      aria-invalid={!!errors.embedCodeOrUrl}
                      {...register("embedCodeOrUrl")}
                    />
                    <p className="mt-2 text-xs text-(--admin-text-muted)">
                      Dán iframe embed code hoặc chỉ URL trong thuộc tính src.
                      Backend vẫn là nguồn kiểm tra/sanitize cuối cùng.
                    </p>
                    <FieldError message={errors.embedCodeOrUrl?.message} />
                  </div>
                ) : (
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                      htmlFor="video-file"
                    >
                      Server storage video file
                    </label>
                    <Input
                      id="video-file"
                      type="file"
                      accept="video/*"
                      className={fieldClass(!!errors.file)}
                      disabled={isBusy}
                      aria-invalid={!!errors.file}
                      {...register("file")}
                    />
                    <FieldError message={errors.file?.message} />

                    <div className="mt-3 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <Server className="mt-0.5 size-4 shrink-0" />
                      <p>
                        Upload sẽ được chia thành nhiều chunk tuần tự, sau đó
                        backend merge vào private server storage.
                      </p>
                    </div>

                    {selectedFile ? (
                      <div className="mt-3 rounded-lg border border-(--admin-border) bg-(--admin-surface) p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-(--admin-primary-soft) text-(--admin-primary)">
                            <FileVideo className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-(--admin-text-strong)">
                              {selectedFile.name}
                            </p>
                            <p className="mt-1 text-sm text-(--admin-text)">
                              {formatFileSize(selectedFile)} ·{" "}
                              {selectedFile.type || "video/*"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {sourceStatusMessage ? (
                  <div
                    className={cn(
                      "mt-4 rounded-lg border px-3 py-2 text-sm",
                      getSourceStatusClass(sourceConfirmState),
                    )}
                  >
                    {sourceConfirmState === "confirming" ? (
                      <Loader2 className="mr-2 inline size-4 animate-spin" />
                    ) : null}
                    {sourceStatusMessage}
                  </div>
                ) : null}
              </div>
            </div>

            {isCurrentSourceConfirmed ? (
              <>
                <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface-alt) p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-(--admin-text-strong)">
                        Thời lượng
                      </h3>
                      <p className="mt-1 text-xs text-(--admin-text-muted)">
                        Tự động khi browser đọc được metadata.
                      </p>
                    </div>
                    <Clock className="size-5 text-(--admin-primary)" />
                  </div>

                  {durationSeconds !== undefined && !showManualDuration ? (
                    <div className="space-y-3">
                      <p className="text-2xl font-semibold text-(--admin-text-strong)">
                        {durationSeconds}s
                      </p>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => setShowManualDuration(true)}
                      >
                        Đổi thời lượng
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <label
                        className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                        htmlFor="duration-seconds"
                      >
                        Thời lượng giây
                      </label>
                      <Input
                        id="duration-seconds"
                        min={0}
                        type="number"
                        className={fieldClass(!!errors.durationSeconds)}
                        aria-invalid={!!errors.durationSeconds}
                        {...register("durationSeconds")}
                      />
                      <p className="mt-2 text-xs text-(--admin-text-muted)">
                        Không lấy được thời lượng, vui lòng nhập thủ công nếu
                        cần.
                      </p>
                      <FieldError message={errors.durationSeconds?.message} />
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface-alt) p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-(--admin-text-strong)">
                        Thumbnail
                      </h3>
                      <p className="mt-1 text-xs text-(--admin-text-muted)">
                        {mode === "local-upload"
                          ? "URL http/https được lưu trực tiếp; file ảnh sẽ lưu trên server storage khi tạo video."
                          : "URL http/https được lưu trực tiếp; file ảnh sẽ được gửi lên backend để lưu theo cấu hình hiện tại."}
                      </p>
                    </div>
                    <ImagePlus className="size-5 text-(--admin-primary)" />
                  </div>

                  <div className="relative aspect-video overflow-hidden rounded-md bg-[linear-gradient(135deg,#e7eef9_0%,#cbdcf1_48%,#9fbde2_100%)] dark:bg-[linear-gradient(135deg,#242936_0%,#1b2230_52%,#111827_100%)]">
                    {thumbnailPreviewUrl && !thumbnailFailed ? (
                      <img
                        alt="Preview thumbnail"
                        className="h-full w-full object-cover"
                        decoding="async"
                        src={thumbnailPreviewUrl}
                        onError={() => setThumbnailFailed(true)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-(--admin-text)">
                        <ImageOff className="size-9 opacity-70" />
                      </div>
                    )}
                  </div>

                  {sourceMetadata.providerNote ? (
                    <p className="mt-2 text-xs text-(--admin-text-muted)">
                      {sourceMetadata.providerNote}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      disabled={
                        !sourceMetadata.thumbnailUrl &&
                        !sourceMetadata.thumbnailFile
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (sourceMetadata.thumbnailUrl) {
                          setValue(
                            "thumbnailUrl",
                            sourceMetadata.thumbnailUrl,
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          );
                        } else if (sourceMetadata.thumbnailFile) {
                          setValue("thumbnailUrl", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          setSourceMetadata((current) => ({
                            ...current,
                            thumbnailSource: current.thumbnailSource ?? "auto",
                          }));
                        }

                        setShowManualThumbnail(false);
                      }}
                    >
                      <Sparkles className="size-4" />
                      Dùng thumbnail này
                    </Button>

                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setShowManualThumbnail(true)}
                    >
                      Thay đổi thumbnail
                    </Button>
                  </div>

                  {!sourceMetadata.thumbnailUrl &&
                  sourceMetadata.thumbnailObjectUrl ? (
                    <p className="mt-2 text-xs text-(--admin-text-muted)">
                      Thumbnail frame sẽ được gửi dưới dạng file ảnh và lưu
                      {mode === "local-upload"
                        ? " lên server storage khi bấm tạo video."
                        : " theo cấu hình backend hiện tại khi bấm tạo video."}
                    </p>
                  ) : null}

                  {showManualThumbnail ? (
                    <div className="mt-4 grid gap-3">
                      <div>
                        <label
                          className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                          htmlFor="thumbnail-url"
                        >
                          Nhập URL thumbnail
                        </label>
                        <Input
                          id="thumbnail-url"
                          placeholder="https://example.com/thumbnail.jpg"
                          className={fieldClass(!!errors.thumbnailUrl)}
                          aria-invalid={!!errors.thumbnailUrl}
                          {...register("thumbnailUrl")}
                        />
                        <FieldError message={errors.thumbnailUrl?.message} />
                      </div>

                      <div>
                        <label
                          className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                          htmlFor="thumbnail-file"
                        >
                          Chọn ảnh từ máy
                        </label>
                        <Input
                          id="thumbnail-file"
                          type="file"
                          accept="image/*"
                          className={fieldClass(false)}
                          onChange={handleManualThumbnailFileChange}
                        />
                        <p className="mt-2 text-xs text-(--admin-text-muted)">
                          {mode === "local-upload"
                            ? "JPG, PNG hoặc WebP sẽ lưu trên private server storage. Không lưu blob URL hoặc data URL vào DB."
                            : "JPG, PNG hoặc WebP sẽ được gửi lên backend để lưu theo cấu hình hiện tại. Không lưu blob URL hoặc data URL vào DB."}
                        </p>
                      </div>

                      {thumbnailUrl ? (
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setValue("thumbnailUrl", "", {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                        >
                          Xóa thumbnail URL
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {mode === "embed" ? (
                  <div className="md:col-span-2">
                    <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface-alt) p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-(--admin-text-strong)">
                          Preview embed
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-(--admin-primary-soft) px-2 py-1 text-xs font-medium text-(--admin-primary)">
                          <Code2 className="size-3" />
                          Đã xác nhận
                        </span>
                      </div>

                      <div className="aspect-video overflow-hidden rounded-md bg-black">
                        {confirmedEmbedPreviewUrl &&
                        isSafePreviewEmbedUrl(confirmedEmbedPreviewUrl) ? (
                          <iframe
                            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                            allowFullScreen
                            className="h-full w-full"
                            loading="lazy"
                            src={confirmedEmbedPreviewUrl}
                            title="Embed video preview"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-white/75">
                            Không có embed preview an toàn.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            <div>
              <label
                className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                htmlFor="view-count"
              >
                Lượt xem
              </label>
              <Input
                id="view-count"
                min={0}
                type="number"
                className={fieldClass(!!errors.viewCount)}
                aria-invalid={!!errors.viewCount}
                {...register("viewCount")}
              />
              <FieldError message={errors.viewCount?.message} />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
                htmlFor="published-at"
              >
                Thời gian xuất bản
              </label>
              <div className="flex gap-2">
                <Input
                  id="published-at"
                  inputMode="numeric"
                  type="text"
                  placeholder="17/03/1999, 10:41"
                  className={fieldClass(!!errors.publishedAt)}
                  aria-invalid={!!errors.publishedAt}
                  {...publishedAtField}
                />
                <Button
                  aria-label="Chọn thời gian hiện tại"
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setValue(
                      "publishedAt",
                      formatAdminPublishedAtInput(new Date()),
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    )
                  }
                >
                  <CalendarClock className="size-4" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="xs"
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setValue(
                      "publishedAt",
                      formatAdminPublishedAtInput(new Date()),
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    )
                  }
                >
                  Bây giờ
                </Button>
                <Button
                  size="xs"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    setValue(
                      "publishedAt",
                      formatAdminPublishedAtInput(today),
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    );
                  }}
                >
                  Hôm nay 00:00
                </Button>
                <Button
                  size="xs"
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setValue("publishedAt", "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  Xóa
                </Button>
              </div>
              <p className="mt-2 text-xs text-(--admin-text-muted)">
                Có thể nhập 17031999, 1041 để tự định dạng thành 17/03/1999,
                10:41.
              </p>
              <FieldError message={errors.publishedAt?.message} />
            </div>
          </div>

          {localUploadProgress ? (
            <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface-alt) p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-(--admin-text-strong)">
                    Server storage upload
                  </p>
                  <p className="mt-1 text-xs text-(--admin-text-muted)">
                    {localUploadProgress.phase === "init"
                      ? "Đang tạo upload session..."
                      : localUploadProgress.phase === "complete"
                        ? "Đang hoàn tất và merge file trên server..."
                        : localUploadProgress.phase === "canceling"
                          ? "Đang hủy upload..."
                          : `Đã upload ${localUploadProgress.uploadedChunks}/${localUploadProgress.totalChunks} chunk.`}
                  </p>
                </div>

                <Button
                  disabled={localUploadProgress.phase === "canceling"}
                  type="button"
                  variant="outline"
                  onClick={() => void handleCancelLocalUpload()}
                >
                  {localUploadProgress.phase === "canceling" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                  Hủy upload
                </Button>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--admin-border)]">
                <div
                  className="h-full rounded-full bg-[var(--admin-primary)] transition-all"
                  style={{
                    width: `${Math.min(
                      Math.max(localUploadProgress.percent, 0),
                      100,
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-right text-xs font-medium text-(--admin-text)">
                {Math.min(Math.max(localUploadProgress.percent, 0), 100)}%
              </p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-(--admin-border) pt-5 sm:flex-row sm:justify-end">
            <Button
              disabled={isBusy}
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>

            <Button disabled={isBusy} type="submit">
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "local-upload" ? (
                <Server className="size-4" />
              ) : mode === "embed" ? (
                <Code2 className="size-4" />
              ) : (
                <Link2 className="size-4" />
              )}
              {mode === "local-upload"
                ? "Upload server storage"
                : mode === "embed"
                  ? "Tạo video nhúng"
                  : "Tạo video"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
