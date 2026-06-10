import { Globe2, Plus, RefreshCcw, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClaimCurrentDomainModal } from "@/features/websites/components/ClaimCurrentDomainModal";
import { WebsiteCard } from "@/features/websites/components/WebsiteCard";
import { WebsiteDomainPanel } from "@/features/websites/components/WebsiteDomainPanel";
import { WebsiteEmptyState } from "@/features/websites/components/WebsiteEmptyState";
import { WebsiteFormModal } from "@/features/websites/components/WebsiteFormModal";
import { WebsiteSkeleton } from "@/features/websites/components/WebsiteSkeleton";
import {
  activateWebsiteDomain,
  claimCurrentWebsiteDomain,
  createWebsite,
  createWebsiteDomain,
  disableWebsite,
  disableWebsiteDomain,
  getWebsiteApiErrorMessage,
  getWebsites,
  updateWebsite,
} from "@/features/websites/websiteApi";
import type {
  CreateWebsitePayload,
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

export function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [meta, setMeta] = useState<WebsitesListResponse["meta"] | null>(null);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingWebsite, setIsSubmittingWebsite] = useState(false);
  const [isSubmittingDomain, setIsSubmittingDomain] = useState(false);
  const [isClaimingDomain, setIsClaimingDomain] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<WebsiteFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<WebsiteFilters>(emptyFilters);

  const selectedWebsite = useMemo(
    () => websites.find((website) => website.id === selectedWebsiteId) ?? null,
    [selectedWebsiteId, websites],
  );

  const selectedPrimaryDomain = useMemo(() => {
    if (!selectedWebsite) {
      return null;
    }

    return (
      selectedWebsite.domains.find(
        (domain) => domain.isPrimary && domain.status === "ACTIVE",
      ) ??
      selectedWebsite.domains.find((domain) => domain.status === "ACTIVE") ??
      null
    );
  }, [selectedWebsite]);

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

  useEffect(() => {
    void fetchWebsites();
  }, [fetchWebsites]);

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
        toast.success("Da cap nhat website.");
      } else {
        const website = await createWebsite(payload as CreateWebsitePayload);
        setSelectedWebsiteId(website.id);
        toast.success("Da tao website.");
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

  async function handleDisableWebsite(website: Website): Promise<void> {
    if (!window.confirm(`Disable website "${website.name}"?`)) {
      return;
    }

    try {
      await disableWebsite(website.id);
      toast.success("Da disable website.");
      await fetchWebsites();
    } catch (disableError) {
      toast.error(getWebsiteApiErrorMessage(disableError));
    }
  }

  async function handleActivateWebsite(website: Website): Promise<void> {
    try {
      await updateWebsite(website.id, {
        status: "ACTIVE",
      } as UpdateWebsitePayload);

      toast.success("Da active website.");
      await fetchWebsites();
    } catch (activateError) {
      toast.error(getWebsiteApiErrorMessage(activateError));
    }
  }

  async function handleCreateDomain(payload: {
    domain: string;
    isPrimary: boolean;
  }): Promise<void> {
    if (!selectedWebsite) {
      toast.error("Vui long chon website.");
      return;
    }

    setIsSubmittingDomain(true);

    try {
      await createWebsiteDomain(selectedWebsite.id, {
        domain: payload.domain,
        isPrimary: payload.isPrimary,
      });
      toast.success("Da them domain.");
      await fetchWebsites();
    } catch (domainError) {
      toast.error(getWebsiteApiErrorMessage(domainError));
    } finally {
      setIsSubmittingDomain(false);
    }
  }

  async function handleSetPrimaryDomain(domainId: string): Promise<void> {
    if (!selectedWebsite) {
      return;
    }

    setIsSubmittingDomain(true);

    try {
      await activateWebsiteDomain(selectedWebsite.id, domainId, {
        isPrimary: true,
      });
      toast.success("Da cap nhat primary domain.");
      await fetchWebsites();
    } catch (domainError) {
      toast.error(getWebsiteApiErrorMessage(domainError));
    } finally {
      setIsSubmittingDomain(false);
    }
  }

  async function handleDisableDomain(domainId: string): Promise<void> {
    if (!selectedWebsite) {
      return;
    }

    if (!window.confirm("Disable domain nay?")) {
      return;
    }

    setIsSubmittingDomain(true);

    try {
      await disableWebsiteDomain(selectedWebsite.id, domainId);
      toast.success("Da disable domain.");
      await fetchWebsites();
    } catch (domainError) {
      toast.error(getWebsiteApiErrorMessage(domainError));
    } finally {
      setIsSubmittingDomain(false);
    }
  }

  async function handleActivateDomain(domainId: string): Promise<void> {
    if (!selectedWebsite) {
      return;
    }

    setIsSubmittingDomain(true);

    try {
      await activateWebsiteDomain(selectedWebsite.id, domainId);

      toast.success("Da active domain.");
      await fetchWebsites();
    } catch (domainError) {
      toast.error(getWebsiteApiErrorMessage(domainError));
    } finally {
      setIsSubmittingDomain(false);
    }
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
      toast.success("Da claim current domain.");
      await fetchWebsites();
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
          Claim current domain
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
          Tai lai
        </Button>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-(--admin-border) bg-(--admin-surface) p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)_minmax(0,14rem)_auto]"
        onSubmit={applyFilters}
      >
        <label className="block text-sm font-medium text-(--admin-text-strong)">
          <span className="mb-2 block">Search</span>
          <Input
            className="h-10 border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong)"
            placeholder="Name, slug, domain, or group"
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
          <span className="mb-2 block">Domain</span>
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
          <span className="mb-2 block">Group key</span>
          <Input
            className="h-10 border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong)"
            placeholder="Tìm domain theo tên vd: SML"
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
            Search
          </Button>
          <Button
            disabled={isLoading}
            type="button"
            variant="outline"
            onClick={clearFilters}
          >
            Clear
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
                Danh sach websites
              </h2>
              <span className="text-sm text-(--admin-text-muted)">
                Tong cong: {meta?.total ?? websites.length} websites
              </span>
            </div>

            <Button type="button" onClick={openCreateModal}>
              <Plus className="size-4" />
              Them Website
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
            isSubmitting={isSubmittingDomain}
            website={selectedWebsite}
            onCreateDomain={handleCreateDomain}
            onDisableDomain={handleDisableDomain}
            onSetPrimary={handleSetPrimaryDomain}
            onActivateDomain={handleActivateDomain}
          />
        </div>
      </div>

      <WebsiteFormModal
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
    </section>
  );
}
