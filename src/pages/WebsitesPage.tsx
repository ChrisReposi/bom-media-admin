import { Globe2, Plus, RefreshCcw, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClaimCurrentDomainModal } from "@/features/websites/components/ClaimCurrentDomainModal";
import {
  assignDomainToWebsite,
  getDomains,
  unassignDomain,
} from "@/features/domains/domainApi";
import type { DomainPoolItem } from "@/features/domains/domainTypes";
import { WebsiteCard } from "@/features/websites/components/WebsiteCard";
import { WebsiteDomainPanel } from "@/features/websites/components/WebsiteDomainPanel";
import { WebsiteEmptyState } from "@/features/websites/components/WebsiteEmptyState";
import { WebsiteFormModal } from "@/features/websites/components/WebsiteFormModal";
import { WebsiteSkeleton } from "@/features/websites/components/WebsiteSkeleton";
import {
  claimCurrentWebsiteDomain,
  createWebsite,
  disableWebsite,
  getDomainGroups,
  getWebsiteApiErrorMessage,
  getWebsites,
  updateWebsite,
} from "@/features/websites/websiteApi";
import type {
  CreateWebsitePayload,
  DomainGroup,
  UpdateWebsitePayload,
  Website,
  WebsitesListResponse,
} from "@/features/websites/websiteTypes";

type WebsiteFilters = {
  search: string;
  domain: string;
  domainGroupKey: string;
};

const emptyFilters: WebsiteFilters = {
  search: "",
  domain: "",
  domainGroupKey: "",
};

type PendingWebsiteAction =
  | { type: "disable-website"; website: Website }
  | { type: "unassign-domain"; domainId: string }
  | null;

export function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [domainGroups, setDomainGroups] = useState<DomainGroup[]>([]);
  const [availableDomains, setAvailableDomains] = useState<DomainPoolItem[]>(
    [],
  );
  const [meta, setMeta] = useState<WebsitesListResponse["meta"] | null>(null);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingWebsite, setIsSubmittingWebsite] = useState(false);
  const [isSubmittingDomain, setIsSubmittingDomain] = useState(false);
  const [isClaimingDomain, setIsClaimingDomain] = useState(false);
  const [isLoadingDomainGroups, setIsLoadingDomainGroups] = useState(false);
  const [isLoadingAvailableDomains, setIsLoadingAvailableDomains] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<WebsiteFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<WebsiteFilters>(emptyFilters);
  const [pendingWebsiteAction, setPendingWebsiteAction] =
    useState<PendingWebsiteAction>(null);
  const [isDisablingWebsite, setIsDisablingWebsite] = useState(false);

  const selectedWebsite = useMemo(
    () => websites.find((website) => website.id === selectedWebsiteId) ?? null,
    [selectedWebsiteId, websites],
  );

  const fetchWebsites = useCallback(async () => {
    setIsLoading(true);

    try {
      setError(null);
      const response = await getWebsites({
        page: 1,
        limit: 100,
        search: appliedFilters.search,
        domain: appliedFilters.domain,
        domainGroupKey: appliedFilters.domainGroupKey,
      });
      setWebsites(response.items);
      setMeta(response.meta);
      setSelectedWebsiteId((currentWebsiteId) => {
        if (
          currentWebsiteId &&
          response.items.some((website) => website.id === currentWebsiteId)
        ) {
          return currentWebsiteId;
        }

        return response.items[0]?.id ?? "";
      });
    } catch (fetchError) {
      setError(getWebsiteApiErrorMessage(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

  const fetchDomainGroups = useCallback(async () => {
    setIsLoadingDomainGroups(true);

    try {
      const response = await getDomainGroups({
        page: 1,
        limit: 100,
        status: "ACTIVE",
      });
      setDomainGroups(response.items);
    } catch (fetchError) {
      toast.error(getWebsiteApiErrorMessage(fetchError));
    } finally {
      setIsLoadingDomainGroups(false);
    }
  }, []);

  const fetchAvailableDomains = useCallback(async () => {
    setIsLoadingAvailableDomains(true);

    try {
      const response = await getDomains({
        page: 1,
        limit: 100,
        usageStatus: "AVAILABLE",
      });
      setAvailableDomains(response.items);
    } catch (fetchError) {
      toast.error(getWebsiteApiErrorMessage(fetchError));
    } finally {
      setIsLoadingAvailableDomains(false);
    }
  }, []);

  useEffect(() => {
    void fetchWebsites();
  }, [fetchWebsites]);

  useEffect(() => {
    void fetchDomainGroups();
  }, [fetchDomainGroups]);

  useEffect(() => {
    void fetchAvailableDomains();
  }, [fetchAvailableDomains]);

  function openCreateModal(): void {
    setEditingWebsite(null);
    setIsWebsiteModalOpen(true);
  }

  function openEditModal(website: Website): void {
    setEditingWebsite(website);
    setIsWebsiteModalOpen(true);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAppliedFilters({
      search: filters.search.trim(),
      domain: filters.domain.trim(),
      domainGroupKey: filters.domainGroupKey.trim().toLowerCase(),
    });
  }

  function clearFilters(): void {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  async function handleWebsiteSubmit(
    payload: CreateWebsitePayload | UpdateWebsitePayload,
  ): Promise<void> {
    setIsSubmittingWebsite(true);

    try {
      if (editingWebsite) {
        await updateWebsite(editingWebsite.id, payload);
        toast.success("Đã cập nhật website.");
      } else {
        const website = await createWebsite(payload as CreateWebsitePayload);
        setSelectedWebsiteId(website.id);
        toast.success("Đã tạo website.");
      }

      setIsWebsiteModalOpen(false);
      setEditingWebsite(null);
      await fetchWebsites();
    } catch (submitError) {
      toast.error(getWebsiteApiErrorMessage(submitError));
    } finally {
      setIsSubmittingWebsite(false);
    }
  }

  function handleDisableWebsite(website: Website): void {
    setPendingWebsiteAction({ type: "disable-website", website });
  }

  async function runDisableWebsite(website: Website): Promise<void> {
    setIsDisablingWebsite(true);

    try {
      await disableWebsite(website.id);
      toast.success("Đã vô hiệu hóa website.");
      setPendingWebsiteAction(null);
      await fetchWebsites();
    } catch (disableError) {
      toast.error(getWebsiteApiErrorMessage(disableError));
    } finally {
      setIsDisablingWebsite(false);
    }
  }

  async function handleActivateWebsite(website: Website): Promise<void> {
    try {
      await updateWebsite(website.id, {
        status: "ACTIVE",
      } as UpdateWebsitePayload);

      toast.success("Đã kích hoạt website.");
      await fetchWebsites();
    } catch (activateError) {
      toast.error(getWebsiteApiErrorMessage(activateError));
    }
  }

  async function handleAssignDomain(payload: {
    domainId: string;
    replaceExisting: boolean;
  }): Promise<void> {
    if (!selectedWebsite) {
      toast.error("Vui lòng chọn website.");
      return;
    }

    setIsSubmittingDomain(true);

    try {
      await assignDomainToWebsite(payload.domainId, {
        websiteId: selectedWebsite.id,
        replaceExisting: payload.replaceExisting,
      });
      toast.success("Đã gán tên miền.");
      await fetchWebsites();
      await fetchAvailableDomains();
    } catch (domainError) {
      toast.error(getWebsiteApiErrorMessage(domainError));
    } finally {
      setIsSubmittingDomain(false);
    }
  }

  async function handleUnassignDomain(domainId: string): Promise<void> {
    if (!selectedWebsite) {
      return;
    }

    setPendingWebsiteAction({ type: "unassign-domain", domainId });
  }

  async function runUnassignDomain(domainId: string): Promise<void> {
    if (!selectedWebsite) {
      return;
    }

    setIsSubmittingDomain(true);

    try {
      await unassignDomain(domainId);
      toast.success("Đã gỡ tên miền.");
      setPendingWebsiteAction(null);
      await fetchWebsites();
      await fetchAvailableDomains();
    } catch (domainError) {
      toast.error(getWebsiteApiErrorMessage(domainError));
    } finally {
      setIsSubmittingDomain(false);
    }
  }

  async function handleConfirmWebsiteAction(): Promise<void> {
    if (!pendingWebsiteAction) {
      return;
    }

    if (pendingWebsiteAction.type === "disable-website") {
      await runDisableWebsite(pendingWebsiteAction.website);
      return;
    }

    await runUnassignDomain(pendingWebsiteAction.domainId);
  }

  async function handleClaimCurrentDomain(payload: {
    websiteId: string;
    host: string;
    isPrimary: boolean;
  }): Promise<void> {
    setIsClaimingDomain(true);

    try {
      await claimCurrentWebsiteDomain(payload.websiteId, {
        host: payload.host,
        isPrimary: payload.isPrimary,
      });
      setSelectedWebsiteId(payload.websiteId);
      setIsClaimModalOpen(false);
      toast.success("Đã nhận tên miền hiện tại cho website.");
      await fetchWebsites();
      await fetchAvailableDomains();
    } catch (claimError) {
      toast.error(getWebsiteApiErrorMessage(claimError));
    } finally {
      setIsClaimingDomain(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isLoading || websites.length === 0}
          type="button"
          variant="outline"
          onClick={() => setIsClaimModalOpen(true)}
        >
          <Globe2 className="size-4" />
          Nhận tên miền hiện tại
        </Button>
        <Button
          disabled={isLoading}
          type="button"
          variant="outline"
          onClick={() => void fetchWebsites()}
        >
          <RefreshCcw
            className={isLoading ? "size-4 animate-spin" : "size-4"}
          />
          Tải lại
        </Button>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-(--admin-border) bg-(--admin-surface) p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_minmax(0,14rem)_auto]"
        onSubmit={applyFilters}
      >
        <label className="block text-sm font-medium text-(--admin-text-strong)">
          <span className="mb-2 block">Tìm kiếm</span>
          <Input
            className="h-10 border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong)"
            placeholder="Tên, slug, tên miền hoặc nhóm"
            value={filters.search}
            onChange={(event) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                search: event.target.value,
              }))
            }
          />
        </label>

        <label className="block text-sm font-medium text-(--admin-text-strong)">
          <span className="mb-2 block">Tên miền</span>
          <Input
            className="h-10 border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong)"
            placeholder="example.com"
            value={filters.domain}
            onChange={(event) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                domain: event.target.value,
              }))
            }
          />
        </label>

        <label className="block text-sm font-medium text-(--admin-text-strong)">
          <span className="mb-2 block">Khóa nhóm</span>
          <Input
            className="h-10 border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong)"
            placeholder="Tìm nhóm tên miền, vd: SML"
            value={filters.domainGroupKey}
            onChange={(event) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                domainGroupKey: event.target.value
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9-]+/g, "-")
                  .replace(/^-+|-+$/g, "")
                  .replace(/-{2,}/g, "-")
                  .slice(0, 80),
              }))
            }
          />
        </label>

        <div className="flex items-end gap-2">
          <Button disabled={isLoading} type="submit">
            <Search className="size-4" />
            Tìm kiếm
          </Button>
          <Button
            disabled={isLoading}
            type="button"
            variant="outline"
            onClick={clearFilters}
          >
            Xóa bộ lọc
          </Button>
        </div>
      </form>

      {error ? (
        <div className="rounded-lg border border-(--admin-danger-soft) bg-(--admin-danger-soft) p-4 text-sm text-(--admin-danger)">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-(--admin-text-strong)">
                Danh sách website
              </h2>
              <span className="text-sm text-(--admin-text-muted)">
                Tổng cộng: {meta?.total ?? websites.length} website
              </span>
            </div>

            <Button type="button" onClick={openCreateModal}>
              <Plus className="size-4" />
              Thêm website
            </Button>
          </div>

          {isLoading ? (
            <WebsiteSkeleton />
          ) : websites.length === 0 ? (
            <WebsiteEmptyState />
          ) : (
            <div className="max-h-125 overflow-y-auto pr-2 scrollbar-gutter-stable overscroll-contain">
              <div className="flex flex-col gap-4">
                {websites.map((website) => (
                  <WebsiteCard
                    key={website.id}
                    isSelected={selectedWebsiteId === website.id}
                    website={website}
                    onDisable={(nextWebsite) =>
                      void handleDisableWebsite(nextWebsite)
                    }
                    onActivate={(nextWebsite) =>
                      void handleActivateWebsite(nextWebsite)
                    }
                    onEdit={openEditModal}
                    onSelect={(nextWebsite) =>
                      setSelectedWebsiteId(nextWebsite.id)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <WebsiteDomainPanel
            availableDomains={availableDomains}
            isLoadingDomains={isLoadingAvailableDomains}
            isSubmitting={isSubmittingDomain}
            website={selectedWebsite}
            onAssignDomain={handleAssignDomain}
            onUnassignDomain={handleUnassignDomain}
          />
        </div>
      </div>

      <WebsiteFormModal
        domainGroups={domainGroups}
        isLoadingDomainGroups={isLoadingDomainGroups}
        isSubmitting={isSubmittingWebsite}
        open={isWebsiteModalOpen}
        website={editingWebsite}
        onClose={() => {
          setIsWebsiteModalOpen(false);
          setEditingWebsite(null);
        }}
        onSubmit={handleWebsiteSubmit}
      />

      <ClaimCurrentDomainModal
        isSubmitting={isClaimingDomain}
        open={isClaimModalOpen}
        selectedWebsiteId={selectedWebsiteId}
        websites={websites}
        onClose={() => setIsClaimModalOpen(false)}
        onSubmit={handleClaimCurrentDomain}
      />

      <ConfirmActionDialog
        confirmLabel={
          pendingWebsiteAction?.type === "disable-website"
            ? "Vô hiệu hóa"
            : "Gỡ tên miền"
        }
        description={
          pendingWebsiteAction?.type === "disable-website" ? (
            <>
              Website sẽ chuyển sang trạng thái đã vô hiệu hóa. Website và tên
              miền đã vô hiệu hóa không còn được xem là truy cập công khai được.
              Đây không phải thao tác xóa dữ liệu vĩnh viễn; máy chủ vẫn là nơi
              quyết định cuối cùng.
            </>
          ) : (
            <>
              Tên miền sẽ được gỡ khỏi website. Các liên kết công khai phụ thuộc
              tên miền này có thể không còn truy cập theo tên miền cũ. Bản ghi
              tên miền không bị xóa và máy chủ vẫn là nơi quyết định.
            </>
          )
        }
        isSubmitting={
          pendingWebsiteAction?.type === "unassign-domain"
            ? isSubmittingDomain
            : isDisablingWebsite
        }
        open={pendingWebsiteAction !== null}
        title={
          pendingWebsiteAction?.type === "disable-website"
            ? "Vô hiệu hóa website?"
            : "Gỡ tên miền khỏi website?"
        }
        variant="warning"
        onConfirm={handleConfirmWebsiteAction}
        onOpenChange={(next) => {
          if (!next) {
            setPendingWebsiteAction(null);
          }
        }}
      />
    </section>
  );
}
