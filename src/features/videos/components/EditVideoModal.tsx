import { zodResolver } from "@hookform/resolvers/zod";
import {
  Database,
  ImagePlus,
  Link2,
  Loader2,
  Server,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FocusEvent,
} from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { getDefaultThumbnailUrlFromPlaybackUrl } from "../cloudinaryVideoUtils";
import {
  getLocalVideoThumbnailBlob,
  getApiErrorMessage,
  replaceDatabaseVideoBinary,
  updateLocalVideoThumbnail,
  updateVideo,
} from "../videoApi";
import { dateTimeLocalToIso, isoToDateTimeLocal } from "../videoDateUtils";
import { normalizeVideoFilterKeyInput } from "../videoFilterKeyUtils";
import { editVideoSchema, type EditVideoFormValues } from "../videoSchemas";
import {
  VIDEO_STATUS_OPTIONS,
  type UpdateVideoPayload,
  type VideoAsset,
} from "../videoTypes";

type EditVideoModalProps = {
  open: boolean;
  video: VideoAsset;
  onOpenChange: (open: boolean) => void;
  onUpdated: (video: VideoAsset) => void;
};

const editVideoResolver = zodResolver(
  editVideoSchema as unknown as Parameters<typeof zodResolver>[0],
) as unknown as Resolver<EditVideoFormValues>;

const statusLabels: Record<VideoAsset["status"], string> = {
  DISABLED: "Đã tắt",
  DRAFT: "Nháp",
  FAILED: "Lỗi",
  PROCESSING: "Đang xử lý",
  READY: "Sẵn sàng",
};

function buildDefaultValues(video: VideoAsset): EditVideoFormValues {
  const viewCount = Number(video.viewCount ?? 0);

  return {
    title: video.title,
    description: video.description ?? "",
    filterKey: video.filterKey ?? "",
    playbackUrl: video.playbackUrl ?? "",
    thumbnailUrl:
      video.sourceType === "LOCAL_FILE" && video.localThumbnailAsset
        ? ""
        : (video.thumbnailUrl ?? ""),
    durationSeconds: video.durationSeconds ?? undefined,
    viewCount: Number.isFinite(viewCount) ? viewCount : 0,
    publishedAt: isoToDateTimeLocal(video.publishedAt),
    status: video.status,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-[var(--admin-danger)]">{message}</p>;
}

function fieldClass(hasError: boolean): string {
  return cn(
    "h-10 border-[var(--admin-border)] bg-[var(--admin-input-bg)] text-[var(--admin-text-strong)]",
    "placeholder:text-[var(--admin-text-muted)] focus-visible:ring-[var(--admin-focus-ring)]",
    hasError && "border-[var(--admin-danger)] focus-visible:ring-red-100",
  );
}

function getNumericValue(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function EditVideoModal({
  open,
  video,
  onOpenChange,
  onUpdated,
}: EditVideoModalProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [isReplacingBinary, setIsReplacingBinary] = useState(false);
  const [localThumbnailFile, setLocalThumbnailFile] = useState<File | null>(
    null,
  );
  const [localThumbnailObjectUrl, setLocalThumbnailObjectUrl] = useState<
    string | null
  >(null);
  const [isUpdatingLocalThumbnail, setIsUpdatingLocalThumbnail] =
    useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<EditVideoFormValues>({
    resolver: editVideoResolver,
    defaultValues: buildDefaultValues(video),
    mode: "onBlur",
  });

  const playbackUrl = watch("playbackUrl")?.trim() ?? "";
  const thumbnailUrl = watch("thumbnailUrl")?.trim() ?? "";
  const watchedDurationSeconds = watch("durationSeconds");
  const watchedStatus = watch("status");
  const isDatabaseVideo = video.sourceType === "DB_BLOB";
  const isLocalFileVideo = video.sourceType === "LOCAL_FILE";
  const isBusy = isSubmitting || isReplacingBinary || isUpdatingLocalThumbnail;
  const derivedThumbnailUrl = useMemo(
    () =>
      playbackUrl ? getDefaultThumbnailUrlFromPlaybackUrl(playbackUrl) : null,
    [playbackUrl],
  );
  const previewThumbnailUrl =
    localThumbnailObjectUrl ||
    (isLocalFileVideo && video.localThumbnailAsset
      ? null
      : thumbnailUrl || derivedThumbnailUrl);

  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(video));
      setThumbnailFailed(false);
      setReplacementFile(null);
      setLocalThumbnailFile(null);
    }
  }, [open, reset, video]);

  useEffect(() => {
    if (!open || !isLocalFileVideo || !video.localThumbnailAsset) {
      setLocalThumbnailObjectUrl(null);
      return;
    }

    let isCancelled = false;
    let nextObjectUrl: string | null = null;

    setLocalThumbnailObjectUrl(null);

    void getLocalVideoThumbnailBlob(video)
      .then((blob) => {
        if (isCancelled) {
          return;
        }

        nextObjectUrl = URL.createObjectURL(blob);
        setLocalThumbnailObjectUrl(nextObjectUrl);
      })
      .catch(() => {
        if (!isCancelled) {
          setLocalThumbnailObjectUrl(null);
        }
      });

    return () => {
      isCancelled = true;

      if (nextObjectUrl !== null) {
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [isLocalFileVideo, open, video]);

  useEffect(() => {
    setThumbnailFailed(false);
  }, [previewThumbnailUrl]);

  useEffect(() => {
    return () => {
      if (localThumbnailObjectUrl) {
        URL.revokeObjectURL(localThumbnailObjectUrl);
      }
    };
  }, [localThumbnailObjectUrl]);

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

  async function handleReplaceDatabaseBinary(): Promise<void> {
    if (!replacementFile) {
      toast.error("Vui lòng chọn file video thay thế.");
      return;
    }

    if (!replacementFile.type.startsWith("video/")) {
      toast.error("File thay thế phải là video.");
      return;
    }

    setIsReplacingBinary(true);

    try {
      const durationSeconds = getNumericValue(watchedDurationSeconds);
      const updatedVideo = await replaceDatabaseVideoBinary(video.id, {
        file: replacementFile,
        status: watchedStatus,
        ...(durationSeconds !== undefined ? { durationSeconds } : {}),
      });

      toast.success("Đã thay thế file DB video.");
      setReplacementFile(null);
      onUpdated(updatedVideo);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsReplacingBinary(false);
    }
  }

  function handleLocalThumbnailFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setLocalThumbnailFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Thumbnail phải là file ảnh.");
      event.target.value = "";
      setLocalThumbnailFile(null);
      return;
    }

    if (file.type === "image/svg+xml") {
      toast.error(
        "Không hỗ trợ SVG thumbnail. Vui lòng chọn JPG, PNG hoặc WebP.",
      );
      event.target.value = "";
      setLocalThumbnailFile(null);
      return;
    }

    if (localThumbnailObjectUrl) {
      URL.revokeObjectURL(localThumbnailObjectUrl);
    }

    setThumbnailFailed(false);
    setLocalThumbnailFile(file);
    setLocalThumbnailObjectUrl(URL.createObjectURL(file));
  }

  async function handleUpdateLocalThumbnail(): Promise<void> {
    if (!localThumbnailFile) {
      toast.error("Vui lòng chọn thumbnail local.");
      return;
    }

    setIsUpdatingLocalThumbnail(true);

    try {
      const updatedVideo = await updateLocalVideoThumbnail(video.id, {
        thumbnailFile: localThumbnailFile,
      });

      toast.success("Đã cập nhật local thumbnail.");
      setLocalThumbnailFile(null);
      onUpdated(updatedVideo);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsUpdatingLocalThumbnail(false);
    }
  }

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

  const onSubmit = handleSubmit(async (values) => {
    try {
      const customThumbnailUrl = values.thumbnailUrl?.trim() || undefined;
      const derivedSubmitThumbnailUrl =
        customThumbnailUrl ??
        getDefaultThumbnailUrlFromPlaybackUrl(
          values.playbackUrl?.trim() ?? "",
        ) ??
        undefined;
      const publishedAt = dateTimeLocalToIso(values.publishedAt);
      const durationSeconds = getNumericValue(values.durationSeconds);
      const viewCount = getNumericValue(values.viewCount);
      const description = values.description?.trim() || undefined;
      const filterKey = normalizeVideoFilterKeyInput(values.filterKey ?? "");
      const playbackUrlValue = values.playbackUrl?.trim() || undefined;

      const payload: UpdateVideoPayload = {
        title: values.title,
        status: values.status,
        filterKey: filterKey || null,
        ...(description ? { description } : {}),
        ...(playbackUrlValue ? { playbackUrl: playbackUrlValue } : {}),
        ...(derivedSubmitThumbnailUrl
          ? { thumbnailUrl: derivedSubmitThumbnailUrl }
          : {}),
        ...(durationSeconds !== undefined ? { durationSeconds } : {}),
        ...(viewCount !== undefined ? { viewCount } : {}),
        ...(publishedAt ? { publishedAt } : {}),
      };

      const updatedVideo = await updateVideo(video.id, payload);
      toast.success("Đã cập nhật video.");
      onUpdated(updatedVideo);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  });

  if (!open) {
    return null;
  }

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
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-strong)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--admin-text-strong)]">
              Chỉnh sửa thông tin video
            </h2>
            <p className="mt-1 text-sm text-[var(--admin-text)]">
              Cập nhật metadata video. DB_BLOB và LOCAL_FILE có thao tác file
              riêng bên dưới khi backend hỗ trợ.
            </p>
          </div>

          <button
            aria-label="Đóng modal chỉnh sửa video"
            className="flex size-9 items-center justify-center rounded-md text-[var(--admin-text)] transition hover:bg-[var(--admin-surface-alt)] hover:text-[var(--admin-text-strong)]"
            disabled={isBusy}
            type="button"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <form className="space-y-5 px-5 py-5" noValidate onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                className="mb-2 block text-sm font-medium text-[var(--admin-text-strong)]"
                htmlFor="edit-video-title"
              >
                Tiêu đề
              </label>
              <Input
                id="edit-video-title"
                className={fieldClass(!!errors.title)}
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              <FieldError message={errors.title?.message} />
            </div>

            <div className="md:col-span-2">
              <label
                className="mb-2 block text-sm font-medium text-[var(--admin-text-strong)]"
                htmlFor="edit-video-description"
              >
                Mô tả / Ghi chú
              </label>
              <textarea
                id="edit-video-description"
                className={cn(
                  "min-h-24 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none transition focus-visible:ring-2",
                  fieldClass(!!errors.description),
                )}
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              <FieldError message={errors.description?.message} />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-[var(--admin-text-strong)]"
                htmlFor="edit-video-filter-key"
              >
                Key lọc video
              </label>
              <Input
                id="edit-video-filter-key"
                className={fieldClass(!!errors.filterKey)}
                placeholder="sml, msa, judge_judy, coryxkenshin"
                aria-invalid={!!errors.filterKey}
                {...filterKeyField}
              />
              <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
                Dùng để lọc nhanh video theo chủ đề/kênh. Có thể bỏ trống.
              </p>
              <FieldError message={errors.filterKey?.message} />
            </div>

            <div className="md:col-span-2">
              <label
                className="mb-2 block text-sm font-medium text-[var(--admin-text-strong)]"
                htmlFor="edit-playback-url"
              >
                Playback URL
              </label>
              <Input
                id="edit-playback-url"
                className={fieldClass(!!errors.playbackUrl)}
                aria-invalid={!!errors.playbackUrl}
                {...register("playbackUrl")}
              />
              <FieldError message={errors.playbackUrl?.message} />
            </div>

            <div className="md:col-span-2">
              <label
                className="mb-2 block text-sm font-medium text-[var(--admin-text-strong)]"
                htmlFor="edit-thumbnail-url"
              >
                Thumbnail URL
              </label>
              <Input
                id="edit-thumbnail-url"
                className={fieldClass(!!errors.thumbnailUrl)}
                aria-invalid={!!errors.thumbnailUrl}
                {...register("thumbnailUrl")}
              />
              <FieldError message={errors.thumbnailUrl?.message} />
            </div>

            <div className="md:col-span-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--admin-text-strong)]">
                  Preview thumbnail
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-primary-soft)] px-2 py-1 text-xs font-medium text-[var(--admin-primary)]">
                  <Sparkles className="size-3" />
                  {thumbnailUrl
                    ? "Thumbnail tùy chỉnh"
                    : isLocalFileVideo && localThumbnailObjectUrl
                      ? "Local thumbnail"
                      : derivedThumbnailUrl
                        ? "Thumbnail tự động từ Cloudinary"
                        : "Chưa có thumbnail"}
                </span>
              </div>

              <div className="aspect-video overflow-hidden rounded-md bg-[linear-gradient(135deg,#e7eef9_0%,#cbdcf1_48%,#9fbde2_100%)] dark:bg-[linear-gradient(135deg,#242936_0%,#1b2230_52%,#111827_100%)]">
                {previewThumbnailUrl && !thumbnailFailed ? (
                  <img
                    alt="Preview thumbnail"
                    className="h-full w-full object-cover"
                    decoding="async"
                    src={previewThumbnailUrl}
                    onError={() => setThumbnailFailed(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-[var(--admin-text)]">
                    Không có thumbnail
                  </div>
                )}
              </div>
            </div>

            {isLocalFileVideo ? (
              <section className="md:col-span-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <div className="mb-3 flex items-start gap-3">
                  <span className="rounded-full bg-[var(--admin-primary-soft)] p-2 text-[var(--admin-primary)]">
                    <Server className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--admin-text-strong)]">
                      Local thumbnail
                    </h3>
                    <p className="mt-1 text-sm text-[var(--admin-text)]">
                      Thumbnail này được lưu trên private server storage, không
                      upload lên Cloudinary.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    accept="image/jpeg,image/png,image/webp"
                    className={fieldClass(false)}
                    disabled={isBusy}
                    type="file"
                    onChange={handleLocalThumbnailFileChange}
                  />
                  <Button
                    disabled={isBusy || localThumbnailFile === null}
                    type="button"
                    variant="outline"
                    onClick={() => void handleUpdateLocalThumbnail()}
                  >
                    {isUpdatingLocalThumbnail ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ImagePlus className="size-4" />
                    )}
                    Lưu thumbnail local
                  </Button>
                </div>

                {localThumbnailFile ? (
                  <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
                    File đã chọn: {localThumbnailFile.name}
                  </p>
                ) : null}
              </section>
            ) : null}

            <div>
              <label
                className="mb-2 block text-sm font-medium text-[var(--admin-text-strong)]"
                htmlFor="edit-duration-seconds"
              >
                Thời lượng giây
              </label>
              <Input
                id="edit-duration-seconds"
                min={0}
                type="number"
                className={fieldClass(!!errors.durationSeconds)}
                aria-invalid={!!errors.durationSeconds}
                {...register("durationSeconds")}
              />
              <FieldError message={errors.durationSeconds?.message} />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-[var(--admin-text-strong)]"
                htmlFor="edit-view-count"
              >
                Lượt xem
              </label>
              <Input
                id="edit-view-count"
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
                className="mb-2 block text-sm font-medium text-[var(--admin-text-strong)]"
                htmlFor="edit-published-at"
              >
                Thời gian xuất bản
              </label>
              <Input
                id="edit-published-at"
                type="datetime-local"
                className={fieldClass(!!errors.publishedAt)}
                aria-invalid={!!errors.publishedAt}
                {...register("publishedAt")}
              />
              <FieldError message={errors.publishedAt?.message} />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-[var(--admin-text-strong)]"
                htmlFor="edit-status"
              >
                Trạng thái
              </label>
              <select
                id="edit-status"
                className={cn(
                  "h-10 w-full rounded-md border px-3 text-sm outline-none transition focus-visible:ring-2",
                  fieldClass(!!errors.status),
                )}
                aria-invalid={!!errors.status}
                {...register("status")}
              >
                {VIDEO_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
              <FieldError message={errors.status?.message} />
            </div>
          </div>

          {isDatabaseVideo ? (
            <section className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
              <div className="mb-3 flex items-start gap-3">
                <span className="rounded-full bg-[var(--admin-primary-soft)] p-2 text-[var(--admin-primary)]">
                  <Database className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--admin-text-strong)]">
                    Thay thế DB video file
                  </h3>
                  <p className="mt-1 text-sm text-[var(--admin-text)]">
                    Giữ nguyên video ID và share link hiện có, nhưng thay binary
                    đang lưu trong database.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  accept="video/*"
                  className={fieldClass(false)}
                  disabled={isBusy}
                  type="file"
                  onChange={(event) =>
                    setReplacementFile(event.target.files?.[0] ?? null)
                  }
                />
                <Button
                  disabled={isBusy || replacementFile === null}
                  type="button"
                  variant="outline"
                  onClick={() => void handleReplaceDatabaseBinary()}
                >
                  {isReplacingBinary ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Thay file
                </Button>
              </div>

              {replacementFile ? (
                <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
                  File đã chọn: {replacementFile.name}
                </p>
              ) : null}
            </section>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--admin-border)] pt-5 sm:flex-row sm:justify-end">
            <Button
              disabled={isBusy}
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>

            <Button disabled={isBusy} type="submit">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Link2 className="size-4" />
              )}
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
