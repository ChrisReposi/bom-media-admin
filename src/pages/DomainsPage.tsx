import { Plus, RefreshCcw, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssignDomainModal } from "@/features/domains/components/AssignDomainModal";
import { DomainCard } from "@/features/domains/components/DomainCard";
import { DomainFormModal } from "@/features/domains/components/DomainFormModal";
import { DomainGroupCard } from "@/features/domains/components/DomainGroupCard";
import { DomainGroupFormModal } from "@/features/domains/components/DomainGroupFormModal";
import {
  activateDomain,
  assignDomainToWebsite,
  createDomain,
  createDomainGroup,
  disableDomain,
  disableDomainGroup,
  getDomainApiErrorMessage,
  getDomainGroups,
  getDomains,
  unassignDomain,
  updateDomain,
  updateDomainGroup,
} from "@/features/domains/domainApi";
import type {
  CreateDomainGroupPayload,
  CreateDomainPayload,
  DomainGroup,
  DomainPoolItem,
  DomainsListResponse,
  DomainStatus,
  DomainUsageStatus,
  UpdateDomainGroupPayload,
  UpdateDomainPayload,
} from "@/features/domains/domainTypes";
import { getWebsites } from "@/features/websites/websiteApi";
import type { Website } from "@/features/websites/websiteTypes";

type DomainsTab = "domains" | "groups";

type DomainFilters = {
  search: string;
  usageStatus: "" | DomainUsageStatus;
  status: "" | DomainStatus;
  domainGroupKey: string;
};

const emptyFilters: DomainFilters = {
  search: "",
  usageStatus: "",
  status: "",
  domainGroupKey: "",
};

const adminInputClass = [
  "h-10 border shadow-sm transition-colors",
  "bg-[#EFF4FB] text-[#15253e] placeholder:text-[#15253e]",
  "border-slate-300 hover:border-slate-400",
  "focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20",
  "dark:bg-[#18191A] dark:text-[#f1f1f1] dark:placeholder:text-[#f1f1f1]",
  "dark:border-[#3A3B3C] dark:hover:border-[#5A5B5C]",
].join(" ");

const adminSelectClass = [
  "h-10 w-full rounded-md border px-3 text-sm shadow-sm outline-none transition-colors",
  "bg-[#EFF4FB] text-[#15253e]",
  "border-slate-300 hover:border-slate-400",
  "focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20",
  "dark:bg-[#18191A] dark:text-[#f1f1f1]",
  "dark:border-[#3A3B3C] dark:hover:border-[#5A5B5C]",
  "dark:focus:border-[#60A5FA] dark:focus:ring-[#60A5FA]/25",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

const adminOptionStyle = {
  backgroundColor: "var(--admin-input-bg)",
  color: "var(--admin-text-strong)",
};

export function DomainsPage() {
  const [activeTab, setActiveTab] = useState<DomainsTab>("domains");
  const [domains, setDomains] = useState<DomainPoolItem[]>([]);
  const [domainGroups, setDomainGroups] = useState<DomainGroup[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [meta, setMeta] = useState<DomainsListResponse["meta"] | null>(null);
  const [filters, setFilters] = useState<DomainFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<DomainFilters>(emptyFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<DomainPoolItem | null>(
    null,
  );
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DomainGroup | null>(null);
  const [assigningDomain, setAssigningDomain] = useState<DomainPoolItem | null>(
    null,
  );

  const activeDomainGroups = useMemo(
    () => domainGroups.filter((group) => group.status === "ACTIVE"),
    [domainGroups],
  );

  const fetchDomainData = useCallback(async () => {
    setIsLoading(true);

    try {
      setError(null);
      const [domainsResponse, groupsResponse, websitesResponse] =
        await Promise.all([
          getDomains({
            page: 1,
            limit: 100,
            search: appliedFilters.search,
            usageStatus: appliedFilters.usageStatus || undefined,
            status: appliedFilters.status || undefined,
            domainGroupKey: appliedFilters.domainGroupKey || undefined,
          }),
          getDomainGroups({ page: 1, limit: 100 }),
          getWebsites({ page: 1, limit: 100 }),
        ]);

      setDomains(domainsResponse.items);
      setMeta(domainsResponse.meta);
      setDomainGroups(groupsResponse.items);
      setWebsites(websitesResponse.items);
    } catch (fetchError) {
      setError(getDomainApiErrorMessage(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void fetchDomainData();
  }, [fetchDomainData]);

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAppliedFilters({
      search: filters.search.trim(),
      usageStatus: filters.usageStatus,
      status: filters.status,
      domainGroupKey: filters.domainGroupKey.trim(),
    });
  }

  function clearFilters(): void {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  async function handleDomainSubmit(
    payload: CreateDomainPayload | UpdateDomainPayload,
  ): Promise<void> {
    setIsSubmitting(true);

    try {
      if (editingDomain) {
        await updateDomain(editingDomain.id, payload);
        toast.success("Domain updated.");
      } else {
        await createDomain(payload as CreateDomainPayload);
        toast.success("Domain created.");
      }

      setDomainModalOpen(false);
      setEditingDomain(null);
      await fetchDomainData();
    } catch (submitError) {
      toast.error(getDomainApiErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDomainGroupSubmit(
    payload: CreateDomainGroupPayload | UpdateDomainGroupPayload,
  ): Promise<void> {
    setIsSubmitting(true);

    try {
      if (editingGroup) {
        await updateDomainGroup(editingGroup.id, payload);
        toast.success("Domain group updated.");
      } else {
        await createDomainGroup(payload as CreateDomainGroupPayload);
        toast.success("Domain group created.");
      }

      setGroupModalOpen(false);
      setEditingGroup(null);
      await fetchDomainData();
    } catch (submitError) {
      toast.error(getDomainApiErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAssign(payload: {
    websiteId: string;
    replaceExisting?: boolean;
  }): Promise<void> {
    if (!assigningDomain) return;

    setIsSubmitting(true);

    try {
      await assignDomainToWebsite(assigningDomain.id, payload);
      toast.success("Domain assigned.");
      setAssigningDomain(null);
      await fetchDomainData();
    } catch (assignError) {
      toast.error(getDomainApiErrorMessage(assignError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisableDomain(domain: DomainPoolItem): Promise<void> {
    if (!window.confirm(`Disable domain "${domain.domain}"?`)) return;

    setIsSubmitting(true);
    try {
      await disableDomain(domain.id);
      toast.success("Domain disabled.");
      await fetchDomainData();
    } catch (disableError) {
      toast.error(getDomainApiErrorMessage(disableError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleActivateDomain(domain: DomainPoolItem): Promise<void> {
    setIsSubmitting(true);
    try {
      await activateDomain(domain.id);
      toast.success("Domain activated.");
      await fetchDomainData();
    } catch (activateError) {
      toast.error(getDomainApiErrorMessage(activateError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUnassignDomain(domain: DomainPoolItem): Promise<void> {
    if (!window.confirm(`Unassign domain "${domain.domain}"?`)) return;

    setIsSubmitting(true);
    try {
      await unassignDomain(domain.id);
      toast.success("Domain unassigned.");
      await fetchDomainData();
    } catch (unassignError) {
      toast.error(getDomainApiErrorMessage(unassignError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisableGroup(group: DomainGroup): Promise<void> {
    if (!window.confirm(`Disable domain group "${group.name}"?`)) return;

    setIsSubmitting(true);
    try {
      await disableDomainGroup(group.id);
      toast.success("Domain group disabled.");
      await fetchDomainData();
    } catch (disableError) {
      toast.error(getDomainApiErrorMessage(disableError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-(--admin-text-strong)">
            Domain Management
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-(--admin-text-muted)">
            Manage the domain pool, classify domains by group, and assign one
            active domain to each website.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              setEditingDomain(null);
              setDomainModalOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Domain
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingGroup(null);
              setGroupModalOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Group
          </Button>
          <Button
            disabled={isLoading}
            type="button"
            variant="outline"
            onClick={() => void fetchDomainData()}
          >
            <RefreshCcw
              className={isLoading ? "size-4 animate-spin" : "size-4"}
            />
            Refresh
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist">
        <Button
          type="button"
          variant={activeTab === "domains" ? "default" : "outline"}
          onClick={() => setActiveTab("domains")}
        >
          Domains
        </Button>
        <Button
          type="button"
          variant={activeTab === "groups" ? "default" : "outline"}
          onClick={() => setActiveTab("groups")}
        >
          Domain Groups
        </Button>
      </div>

      {activeTab === "domains" ? (
        <>
          <form
            className="grid gap-3 rounded-lg border border-(--admin-border) bg-(--admin-surface) p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_minmax(0,12rem)_minmax(0,14rem)_auto]"
            onSubmit={applyFilters}
          >
            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Search domain</span>
              <Input
                className={adminInputClass}
                placeholder="127.0.0.1:5500"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
              />
            </label>

            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Usage</span>
              <select
                className={adminSelectClass}
                value={filters.usageStatus}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    usageStatus: event.target.value as "" | DomainUsageStatus,
                  }))
                }
              >
                <option style={adminOptionStyle} value="">
                  All
                </option>
                <option style={adminOptionStyle} value="AVAILABLE">
                  Available
                </option>
                <option style={adminOptionStyle} value="IN_USE">
                  In use
                </option>
                <option style={adminOptionStyle} value="DISABLED">
                  Disabled
                </option>
              </select>
            </label>

            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Status</span>
              <select
                className={adminSelectClass}
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as "" | DomainStatus,
                  }))
                }
              >
                <option style={adminOptionStyle} value="">
                  All
                </option>
                <option style={adminOptionStyle} value="ACTIVE">
                  ACTIVE
                </option>
                <option style={adminOptionStyle} value="DISABLED">
                  DISABLED
                </option>
              </select>
            </label>

            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Group</span>
              <select
                className={adminSelectClass}
                value={filters.domainGroupKey}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    domainGroupKey: event.target.value,
                  }))
                }
              >
                <option style={adminOptionStyle} value="">
                  All groups
                </option>

                {domainGroups.map((group) => (
                  <option
                    key={group.id}
                    style={adminOptionStyle}
                    value={group.key}
                  >
                    {group.name} ({group.key})
                  </option>
                ))}
              </select>
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

          <div className="text-sm text-(--admin-text-muted)">
            Total: {meta?.total ?? domains.length} domains
          </div>

          {error ? (
            <div className="rounded-lg border border-(--admin-danger-soft) bg-(--admin-danger-soft) p-4 text-sm text-(--admin-danger)">
              {error}
            </div>
          ) : null}

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-6 text-sm text-(--admin-text-muted)">
                Loading domains...
              </div>
            ) : domains.length === 0 ? (
              <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-6 text-sm text-(--admin-text-muted)">
                No domains match the current filters.
              </div>
            ) : (
              domains.map((domain) => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  isBusy={isSubmitting}
                  onActivate={(nextDomain) =>
                    void handleActivateDomain(nextDomain)
                  }
                  onAssign={(nextDomain) => setAssigningDomain(nextDomain)}
                  onDisable={(nextDomain) =>
                    void handleDisableDomain(nextDomain)
                  }
                  onEdit={(nextDomain) => {
                    setEditingDomain(nextDomain);
                    setDomainModalOpen(true);
                  }}
                  onUnassign={(nextDomain) =>
                    void handleUnassignDomain(nextDomain)
                  }
                />
              ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-6 text-sm text-(--admin-text-muted)">
              Loading domain groups...
            </div>
          ) : domainGroups.length === 0 ? (
            <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-6 text-sm text-(--admin-text-muted)">
              No domain groups yet.
            </div>
          ) : (
            domainGroups.map((group) => (
              <DomainGroupCard
                key={group.id}
                group={group}
                isBusy={isSubmitting}
                onDisable={(nextGroup) => void handleDisableGroup(nextGroup)}
                onEdit={(nextGroup) => {
                  setEditingGroup(nextGroup);
                  setGroupModalOpen(true);
                }}
              />
            ))
          )}
        </div>
      )}

      <DomainFormModal
        domain={editingDomain}
        domainGroups={activeDomainGroups}
        isSubmitting={isSubmitting}
        open={domainModalOpen}
        onClose={() => {
          setDomainModalOpen(false);
          setEditingDomain(null);
        }}
        onSubmit={handleDomainSubmit}
      />

      <DomainGroupFormModal
        group={editingGroup}
        isSubmitting={isSubmitting}
        open={groupModalOpen}
        onClose={() => {
          setGroupModalOpen(false);
          setEditingGroup(null);
        }}
        onSubmit={handleDomainGroupSubmit}
      />

      <AssignDomainModal
        domain={assigningDomain}
        isSubmitting={isSubmitting}
        open={assigningDomain !== null}
        websites={websites}
        onClose={() => setAssigningDomain(null)}
        onSubmit={handleAssign}
      />
    </section>
  );
}
