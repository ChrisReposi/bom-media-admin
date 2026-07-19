import {
  AlertCircle,
  CheckSquare2,
  Loader2,
  Search,
  VideoIcon,
  X,
} from "lucide-react";
import { Dialog } from "radix-ui";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  canToggleDraftAssignment,
  calculateAssignmentDelta,
  createAssignmentIdSet,
  mergeAssignmentOptions,
  rebaseAssignmentDraft,
  toggleDraftAssignment,
} from "@/features/dashboard/dashboardAssignmentDraft";
import {
  getAssignmentManagementErrorMessage,
  getAssignmentMutationInvalidVideoIds,
} from "@/features/dashboard/dashboardAssignmentPolicy";
import { getVideoSourceLabel } from "@/features/videos/videoSourceUtils";
import {
  getWebsiteVideoAssignmentOptions,
  type WebsiteVideoAssignmentOptionsQuery,
} from "@/features/websites/websiteApi";
import type {
  UpdateWebsiteVideoAssignmentsPayload,
  UpdateWebsiteVideoAssignmentsResponse,
  Website,
  WebsiteVideoAssignmentOption,
} from "@/features/websites/websiteTypes";
import { isApiRequestCanceled } from "@/lib/api/apiError";

const ASSIGNMENT_PAGE_SIZE = 24;
const ASSIGNMENT_SEARCH_MIN_LENGTH = 2;

type AssignWebsiteVideoDialogProps = {
  open: boolean;
  website: Website | null;
  canManage: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (
    payload: UpdateWebsiteVideoAssignmentsPayload,
  ) => Promise<UpdateWebsiteVideoAssignmentsResponse>;
};

type AssignmentLoadMode = "reset" | "replace" | "append" | "rebase";

export function AssignWebsiteVideoDialog({
  open,
  website,
  canManage,
  isSubmitting,
  onClose,
  onSave,
}: AssignWebsiteVideoDialogProps) {
  const [options, setOptions] = useState<WebsiteVideoAssignmentOption[]>([]);
  const [baselineAssignedIds, setBaselineAssignedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [draftAssignedIds, setDraftAssignedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filterKey, setFilterKey] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [eligibleCandidateTotal, setEligibleCandidateTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false);
  const requestVersionRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const baselineAssignedIdsRef = useRef(baselineAssignedIds);
  const draftAssignedIdsRef = useRef(draftAssignedIds);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const delta = useMemo(
    () => calculateAssignmentDelta(baselineAssignedIds, draftAssignedIds),
    [baselineAssignedIds, draftAssignedIds],
  );
  const hasChanges =
    delta.assignVideoIds.length > 0 || delta.unassignVideoIds.length > 0;
  const primaryDomain =
    website?.domains.find(
      (domain) => domain.isPrimary && domain.status === "ACTIVE",
    ) ??
    website?.domains.find((domain) => domain.status === "ACTIVE") ??
    null;

  const replaceAssignmentState = useCallback((videoIds: readonly string[]) => {
    const nextBaseline = createAssignmentIdSet(videoIds);
    const nextDraft = createAssignmentIdSet(videoIds);
    baselineAssignedIdsRef.current = nextBaseline;
    draftAssignedIdsRef.current = nextDraft;
    setBaselineAssignedIds(nextBaseline);
    setDraftAssignedIds(nextDraft);
  }, []);

  const loadPage = useCallback(
    async (input: {
      nextPage: number;
      query: Omit<WebsiteVideoAssignmentOptionsQuery, "page" | "limit">;
      mode: AssignmentLoadMode;
      invalidVideoIds?: string[];
    }): Promise<void> => {
      if (!website) return;

      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      input.mode === "append" ? setIsLoadingMore(true) : setIsLoading(true);
      setError(null);

      try {
        const response = await getWebsiteVideoAssignmentOptions(
          website.id,
          {
            page: input.nextPage,
            limit: ASSIGNMENT_PAGE_SIZE,
            ...input.query,
          },
          { signal: controller.signal },
        );
        if (requestVersionRef.current !== requestVersion) return;

        setOptions((current) =>
          input.mode === "append"
            ? mergeAssignmentOptions(current, response.items)
            : response.items,
        );
        setPage(response.meta.page);
        setTotal(response.meta.total);
        setTotalPages(response.meta.totalPages);
        setEligibleCandidateTotal(response.meta.eligibleCandidateTotal);

        if (input.mode === "reset") {
          replaceAssignmentState(response.meta.activeAssignedVideoIds);
        } else if (input.mode === "rebase") {
          const rebased = rebaseAssignmentDraft({
            baselineAssignedIds: baselineAssignedIdsRef.current,
            draftAssignedIds: draftAssignedIdsRef.current,
            nextBaselineAssignedIds: response.meta.activeAssignedVideoIds,
            invalidVideoIds: input.invalidVideoIds,
          });
          baselineAssignedIdsRef.current = rebased.baselineAssignedIds;
          draftAssignedIdsRef.current = rebased.draftAssignedIds;
          setBaselineAssignedIds(rebased.baselineAssignedIds);
          setDraftAssignedIds(rebased.draftAssignedIds);
        }
      } catch (loadError) {
        if (!isApiRequestCanceled(loadError)) {
          setError(getAssignmentManagementErrorMessage(loadError));
        }
      } finally {
        if (requestVersionRef.current === requestVersion) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [replaceAssignmentState, website],
  );

  useEffect(() => {
    if (!open || !website) {
      requestVersionRef.current += 1;
      abortRef.current?.abort();
      return;
    }

    setSearch("");
    setAppliedSearch("");
    setFilterKey("");
    setSourceType("");
    setOptions([]);
    setPage(1);
    setTotal(0);
    setTotalPages(0);
    setError(null);
    setDiscardConfirmationOpen(false);
    replaceAssignmentState([]);
    void loadPage({ nextPage: 1, query: {}, mode: "reset" });

    return () => {
      requestVersionRef.current += 1;
      abortRef.current?.abort();
    };
  }, [loadPage, open, replaceAssignmentState, website]);

  function getCurrentQuery(
    overrides: Partial<WebsiteVideoAssignmentOptionsQuery> = {},
  ): Omit<WebsiteVideoAssignmentOptionsQuery, "page" | "limit"> {
    return {
      search: (overrides.search ?? appliedSearch) || undefined,
      filterKey: (overrides.filterKey ?? filterKey.trim()) || undefined,
      sourceType: (overrides.sourceType ?? sourceType) || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    };
  }

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const normalized = search.trim().replace(/\s+/g, " ").slice(0, 80);
    if (
      normalized.length > 0 &&
      normalized.length < ASSIGNMENT_SEARCH_MIN_LENGTH
    ) {
      setError(
        `Nhập ít nhất ${ASSIGNMENT_SEARCH_MIN_LENGTH} ký tự để tìm video.`,
      );
      return;
    }

    setAppliedSearch(normalized);
    void loadPage({
      nextPage: 1,
      query: getCurrentQuery({ search: normalized }),
      mode: "replace",
    });
  }

  function handleFilterChange(nextFilterKey: string, nextSourceType: string) {
    setFilterKey(nextFilterKey);
    setSourceType(nextSourceType);
    void loadPage({
      nextPage: 1,
      query: {
        search: appliedSearch || undefined,
        filterKey: nextFilterKey.trim() || undefined,
        sourceType: nextSourceType || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
      mode: "replace",
    });
  }

  function handleToggle(option: WebsiteVideoAssignmentOption): void {
    const isChecked = draftAssignedIdsRef.current.has(option.video.id);
    const wasAssigned = baselineAssignedIdsRef.current.has(option.video.id);
    if (
      !canManage ||
      isSubmitting ||
      !canToggleDraftAssignment({
        wasAssigned,
        isChecked,
        canAssign: option.canAssign,
        canUnassign: option.canUnassign,
      })
    ) {
      return;
    }

    const next = toggleDraftAssignment(
      draftAssignedIdsRef.current,
      option.video.id,
    );
    draftAssignedIdsRef.current = next;
    setDraftAssignedIds(next);
  }

  function requestClose(): void {
    if (isSubmitting) return;
    if (hasChanges) {
      setDiscardConfirmationOpen(true);
      return;
    }
    onClose();
  }

  async function handleSave(): Promise<void> {
    if (!canManage || isSubmitting || !hasChanges) return;

    try {
      await onSave(delta);
      onClose();
    } catch (saveError) {
      const message = getAssignmentManagementErrorMessage(saveError);
      const invalidVideoIds = getAssignmentMutationInvalidVideoIds(saveError);
      if (invalidVideoIds.length > 0) {
        await loadPage({
          nextPage: 1,
          query: getCurrentQuery(),
          mode: "rebase",
          invalidVideoIds,
        });
      }
      setError(message);
    }
  }

  return (
    <>
      <Dialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) requestClose();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-(--admin-overlay) data-[state=open]:animate-in data-[state=open]:fade-in motion-reduce:animate-none" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-(--admin-border) bg-(--admin-surface) shadow-(--admin-shadow) data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 motion-reduce:animate-none"
            onEscapeKeyDown={(event) => {
              if (isSubmitting) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (isSubmitting || hasChanges) event.preventDefault();
            }}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              searchInputRef.current?.focus();
            }}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-(--admin-border) p-5">
              <div className="min-w-0">
                <Dialog.Title className="text-lg font-semibold text-(--admin-text-strong)">
                  Quản lý video của website
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-(--admin-text-muted)">
                  {website?.name ?? "Website"}
                  {primaryDomain ? ` · ${primaryDomain.domain}` : ""}. Chọn
                  nhiều video rồi lưu một lần; thao tác này không tạo share
                  link.
                </Dialog.Description>
              </div>
              <Button
                aria-label="Đóng quản lý video"
                disabled={isSubmitting}
                size="icon"
                type="button"
                variant="ghost"
                onClick={requestClose}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5">
              <form
                className="grid shrink-0 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(10rem,0.45fr)_minmax(10rem,0.45fr)_auto]"
                onSubmit={handleSearch}
              >
                <Input
                  ref={searchInputRef}
                  aria-label="Tìm video để quản lý assignment"
                  id="manage-website-video-search"
                  maxLength={80}
                  name="manageWebsiteVideoSearch"
                  placeholder="Tìm video theo tiêu đề..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Input
                  aria-label="Lọc assignment theo key"
                  id="manage-website-video-filter-key"
                  maxLength={64}
                  name="manageWebsiteVideoFilterKey"
                  placeholder="Key lọc..."
                  value={filterKey}
                  onChange={(event) => setFilterKey(event.target.value)}
                />
                <select
                  aria-label="Lọc assignment theo nguồn video"
                  className="h-10 rounded-md border border-(--admin-border) bg-(--admin-input-bg) px-3 text-sm text-(--admin-text-strong)"
                  id="manage-website-video-source"
                  name="manageWebsiteVideoSource"
                  value={sourceType}
                  onChange={(event) =>
                    handleFilterChange(filterKey, event.target.value)
                  }
                >
                  <option value="">Tất cả nguồn</option>
                  <option value="DIRECT_URL">Video link</option>
                  <option value="UPLOAD">Cloudinary</option>
                  <option value="EMBED">Video nhúng</option>
                  <option value="LOCAL_FILE">Video server</option>
                  <option value="DB_BLOB">Video DB</option>
                </select>
                <Button disabled={isLoading || isSubmitting} type="submit">
                  <Search className="size-4" /> Tìm
                </Button>
              </form>

              <div
                aria-live="polite"
                className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-(--admin-surface-alt) px-3 py-2 text-sm text-(--admin-text)"
              >
                <span>Đang gán: {baselineAssignedIds.size}</span>
                <span className="text-(--admin-success)">
                  Sẽ gán: +{delta.assignVideoIds.length}
                </span>
                <span className="text-(--admin-danger)">
                  Sẽ bỏ gán: -{delta.unassignVideoIds.length}
                </span>
                <span className="ml-auto text-(--admin-text-muted)">
                  {total} lựa chọn · {eligibleCandidateTotal} ứng viên chưa gán
                </span>
              </div>

              {error ? (
                <div
                  className="flex shrink-0 items-start gap-2 rounded-lg bg-(--admin-danger-soft) p-3 text-sm text-(--admin-danger)"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
                {isLoading ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-(--admin-text-muted)">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    Đang tải trạng thái assignment...
                  </div>
                ) : options.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-(--admin-border) p-4 text-sm text-(--admin-text-muted)">
                    {appliedSearch || filterKey || sourceType
                      ? "Không có video phù hợp với bộ lọc quản lý."
                      : "Không có video eligible hoặc assignment hiện tại để quản lý."}
                  </div>
                ) : (
                  options.map((option) => (
                    <AssignmentOptionRow
                      key={option.video.id}
                      canManage={canManage}
                      checked={draftAssignedIds.has(option.video.id)}
                      disabled={isSubmitting}
                      option={option}
                      wasAssigned={baselineAssignedIds.has(option.video.id)}
                      onToggle={() => handleToggle(option)}
                    />
                  ))
                )}

                {page < totalPages ? (
                  <div className="flex justify-center pt-2">
                    <Button
                      disabled={isLoadingMore || isSubmitting}
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void loadPage({
                          nextPage: page + 1,
                          query: getCurrentQuery(),
                          mode: "append",
                        })
                      }
                    >
                      {isLoadingMore ? (
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      ) : null}
                      {isLoadingMore ? "Đang tải thêm..." : "Tải thêm video"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-(--admin-border) bg-(--admin-surface) p-5 sm:flex-row sm:justify-end">
              <Button
                disabled={isSubmitting}
                type="button"
                variant="outline"
                onClick={requestClose}
              >
                Hủy
              </Button>
              <Button
                disabled={
                  !canManage || !hasChanges || isLoading || isSubmitting
                }
                type="button"
                onClick={() => void handleSave()}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <CheckSquare2 className="size-4" />
                )}
                {isSubmitting
                  ? "Đang lưu..."
                  : `Lưu thay đổi (${delta.assignVideoIds.length + delta.unassignVideoIds.length})`}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmActionDialog
        confirmLabel="Bỏ thay đổi"
        description="Các lựa chọn gán/bỏ gán chưa lưu sẽ bị hủy."
        open={discardConfirmationOpen}
        title="Đóng mà không lưu?"
        variant="warning"
        onConfirm={() => {
          setDiscardConfirmationOpen(false);
          onClose();
        }}
        onOpenChange={setDiscardConfirmationOpen}
      />
    </>
  );
}

function AssignmentOptionRow({
  option,
  checked,
  canManage,
  disabled,
  wasAssigned,
  onToggle,
}: {
  option: WebsiteVideoAssignmentOption;
  checked: boolean;
  canManage: boolean;
  disabled: boolean;
  wasAssigned: boolean;
  onToggle: () => void;
}) {
  const checkboxId = `website-assignment-${option.video.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const isToggleBlocked =
    disabled ||
    !canManage ||
    !canToggleDraftAssignment({
      wasAssigned,
      isChecked: checked,
      canAssign: option.canAssign,
      canUnassign: option.canUnassign,
    });
  const thumbnailUrl = getSafeThumbnailUrl(option.video.thumbnailUrl);

  return (
    <label
      className={[
        "flex items-center gap-3 rounded-lg border border-(--admin-border) p-3",
        isToggleBlocked
          ? "opacity-70"
          : "cursor-pointer hover:bg-(--admin-surface-alt)",
      ].join(" ")}
      htmlFor={checkboxId}
    >
      <input
        checked={checked}
        disabled={isToggleBlocked}
        id={checkboxId}
        name="websiteVideoAssignmentIds"
        type="checkbox"
        value={option.video.id}
        onChange={onToggle}
      />
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-(--admin-surface-alt)">
        {thumbnailUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            loading="lazy"
            src={thumbnailUrl}
          />
        ) : (
          <VideoIcon className="size-6 text-(--admin-text-muted)" />
        )}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-(--admin-text-strong)">
          {option.video.title}
        </span>
        <span className="block truncate font-mono text-xs text-(--admin-text-muted)">
          {option.video.id}
        </span>
        <span className="mt-1 flex flex-wrap gap-2 text-xs text-(--admin-text-muted)">
          <span>{getVideoSourceLabel(option.video)}</span>
          <span>{option.video.status}</span>
          <span>{option.isAssigned ? "Đang gán ACTIVE" : "Chưa gán"}</span>
          {option.blockedReason ? (
            <span className="text-(--admin-warning)">
              {getBlockedReasonText(option.blockedReason)}
            </span>
          ) : null}
        </span>
      </span>
    </label>
  );
}

function getBlockedReasonText(reason: string): string {
  if (reason === "VIDEO_NOT_READY") return "Không READY; vẫn có thể bỏ gán";
  if (reason === "VIDEO_NOT_PLAYABLE") {
    return "Không playable; vẫn có thể bỏ gán";
  }
  return reason;
}

function getSafeThumbnailUrl(value: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:"
      ? normalized
      : null;
  } catch {
    return null;
  }
}
