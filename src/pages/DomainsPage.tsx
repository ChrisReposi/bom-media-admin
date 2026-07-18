import { Plus, RefreshCcw, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { AdminReadOnlyNotice } from "@/components/common/AdminReadOnlyNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminPermission } from "@/features/auth/useAdminPermission";
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
  "h-10 border border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong)",
  "placeholder:text-(--admin-text-muted) shadow-sm transition-colors",
  "hover:border-(--admin-border-strong)",
  "focus-visible:border-(--admin-primary) focus-visible:ring-2 focus-visible:ring-(--admin-focus-ring)",
].join(" ");

const adminSelectClass = [
  "h-10 w-full rounded-md border border-(--admin-border) bg-(--admin-input-bg) px-3 text-sm text-(--admin-text-strong)",
  "shadow-sm outline-none transition-colors",
  "hover:border-(--admin-border-strong)",
  "focus:border-(--admin-primary) focus:ring-2 focus:ring-(--admin-focus-ring)",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

const adminOptionStyle = {
  backgroundColor: "var(--admin-input-bg)",
  color: "var(--admin-text-strong)",
};

type PendingDomainAction =
  | { type: "disable-domain"; domain: DomainPoolItem }
  | { type: "unassign-domain"; domain: DomainPoolItem }
  | { type: "disable-group"; group: DomainGroup }
  | null;

export function DomainsPage() {
  const canWriteDomains = useAdminPermission("domain.write");
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
  const [pendingDomainAction, setPendingDomainAction] =
    useState<PendingDomainAction>(null);

  const activeDomainGroups = useMemo(
    () => domainGroups.filter((group) => group.status === "ACTIVE"),
    [domainGroups],
  );

  useEffect(() => {
    if (canWriteDomains) {
      return;
    }

    setDomainModalOpen(false);
    setGroupModalOpen(false);
    setEditingDomain(null);
    setEditingGroup(null);
    setAssigningDomain(null);
    setPendingDomainAction(null);
  }, [canWriteDomains]);

  function requireDomainWrite(): boolean {
    if (canWriteDomains) {
      return true;
    }

    toast.error("Bạn không có quyền thay đổi tên miền.");
    return false;
  }

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
    if (!requireDomainWrite()) return;
    setIsSubmitting(true);

    try {
      if (editingDomain) {
        await updateDomain(editingDomain.id, payload);
        toast.success("Đã cập nhật tên miền.");
      } else {
        await createDomain(payload as CreateDomainPayload);
        toast.success("Đã tạo tên miền.");
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
    if (!requireDomainWrite()) return;
    setIsSubmitting(true);

    try {
      if (editingGroup) {
        await updateDomainGroup(editingGroup.id, payload);
        toast.success("Đã cập nhật nhóm tên miền.");
      } else {
        await createDomainGroup(payload as CreateDomainGroupPayload);
        toast.success("Đã tạo nhóm tên miền.");
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
    if (!requireDomainWrite()) return;
    if (!assigningDomain) return;

    setIsSubmitting(true);

    try {
      await assignDomainToWebsite(assigningDomain.id, payload);
      toast.success("Đã gán tên miền.");
      setAssigningDomain(null);
      await fetchDomainData();
    } catch (assignError) {
      toast.error(getDomainApiErrorMessage(assignError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDisableDomain(domain: DomainPoolItem): void {
    if (!requireDomainWrite()) return;
    setPendingDomainAction({ type: "disable-domain", domain });
  }

  async function runDisableDomain(domain: DomainPoolItem): Promise<void> {
    setIsSubmitting(true);
    try {
      await disableDomain(domain.id);
      toast.success("Đã vô hiệu hóa tên miền.");
      setPendingDomainAction(null);
      await fetchDomainData();
    } catch (disableError) {
      toast.error(getDomainApiErrorMessage(disableError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleActivateDomain(domain: DomainPoolItem): Promise<void> {
    if (!requireDomainWrite()) return;
    setIsSubmitting(true);
    try {
      await activateDomain(domain.id);
      toast.success("Đã kích hoạt tên miền.");
      await fetchDomainData();
    } catch (activateError) {
      toast.error(getDomainApiErrorMessage(activateError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleUnassignDomain(domain: DomainPoolItem): void {
    if (!requireDomainWrite()) return;
    setPendingDomainAction({ type: "unassign-domain", domain });
  }

  async function runUnassignDomain(domain: DomainPoolItem): Promise<void> {
    setIsSubmitting(true);
    try {
      await unassignDomain(domain.id);
      toast.success("Đã gỡ tên miền.");
      setPendingDomainAction(null);
      await fetchDomainData();
    } catch (unassignError) {
      toast.error(getDomainApiErrorMessage(unassignError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDisableGroup(group: DomainGroup): void {
    if (!requireDomainWrite()) return;
    setPendingDomainAction({ type: "disable-group", group });
  }

  async function runDisableGroup(group: DomainGroup): Promise<void> {
    setIsSubmitting(true);
    try {
      await disableDomainGroup(group.id);
      toast.success("Đã vô hiệu hóa nhóm tên miền.");
      setPendingDomainAction(null);
      await fetchDomainData();
    } catch (disableError) {
      toast.error(getDomainApiErrorMessage(disableError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDomainAction(): Promise<void> {
    if (!requireDomainWrite()) {
      setPendingDomainAction(null);
      return;
    }

    if (!pendingDomainAction) {
      return;
    }

    if (pendingDomainAction.type === "disable-domain") {
      await runDisableDomain(pendingDomainAction.domain);
      return;
    }

    if (pendingDomainAction.type === "unassign-domain") {
      await runUnassignDomain(pendingDomainAction.domain);
      return;
    }

    await runDisableGroup(pendingDomainAction.group);
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-(--admin-text-strong)">
            Quản lý tên miền
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-(--admin-text-muted)">
            Quản lý kho tên miền, phân loại theo nhóm và gán một tên miền đang
            hoạt động cho mỗi website.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canWriteDomains ? (
            <>
              <Button
                type="button"
                onClick={() => {
                  setEditingDomain(null);
                  setDomainModalOpen(true);
                }}
              >
                <Plus className="size-4" />
                Thêm tên miền
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
                Thêm nhóm
              </Button>
            </>
          ) : null}
          <Button
            disabled={isLoading}
            type="button"
            variant="outline"
            onClick={() => void fetchDomainData()}
          >
            <RefreshCcw
              className={isLoading ? "size-4 animate-spin" : "size-4"}
            />
            Tải lại
          </Button>
        </div>
      </header>

      {!canWriteDomains ? <AdminReadOnlyNotice /> : null}

      <div
        aria-label="Chế độ xem"
        className="flex flex-wrap gap-2"
        role="group"
      >
        <Button
          aria-pressed={activeTab === "domains"}
          type="button"
          variant={activeTab === "domains" ? "default" : "outline"}
          onClick={() => setActiveTab("domains")}
        >
          Tên miền
        </Button>
        <Button
          aria-pressed={activeTab === "groups"}
          type="button"
          variant={activeTab === "groups" ? "default" : "outline"}
          onClick={() => setActiveTab("groups")}
        >
          Nhóm tên miền
        </Button>
      </div>

      {activeTab === "domains" ? (
        <>
          <form
            className="grid gap-3 rounded-lg border border-(--admin-border) bg-(--admin-surface) p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_minmax(0,12rem)_minmax(0,14rem)_auto]"
            onSubmit={applyFilters}
          >
            <label
              className="block text-sm font-medium text-(--admin-text-strong)"
              htmlFor="domains-search"
            >
              <span className="mb-2 block">Tìm tên miền</span>
              <Input
                className={adminInputClass}
                id="domains-search"
                name="domainsSearch"
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

            <label
              className="block text-sm font-medium text-(--admin-text-strong)"
              htmlFor="domains-usage-status"
            >
              <span className="mb-2 block">Tình trạng dùng</span>
              <select
                className={adminSelectClass}
                id="domains-usage-status"
                name="domainsUsageStatus"
                value={filters.usageStatus}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    usageStatus: event.target.value as "" | DomainUsageStatus,
                  }))
                }
              >
                <option style={adminOptionStyle} value="">
                  Tất cả
                </option>
                <option style={adminOptionStyle} value="AVAILABLE">
                  Sẵn sàng
                </option>
                <option style={adminOptionStyle} value="IN_USE">
                  Đang sử dụng
                </option>
                <option style={adminOptionStyle} value="DISABLED">
                  Đã vô hiệu hóa
                </option>
              </select>
            </label>

            <label
              className="block text-sm font-medium text-(--admin-text-strong)"
              htmlFor="domains-status"
            >
              <span className="mb-2 block">Trạng thái</span>
              <select
                className={adminSelectClass}
                id="domains-status"
                name="domainsStatus"
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as "" | DomainStatus,
                  }))
                }
              >
                <option style={adminOptionStyle} value="">
                  Tất cả
                </option>
                <option style={adminOptionStyle} value="ACTIVE">
                  Đang hoạt động
                </option>
                <option style={adminOptionStyle} value="DISABLED">
                  Đã vô hiệu hóa
                </option>
              </select>
            </label>

            <label
              className="block text-sm font-medium text-(--admin-text-strong)"
              htmlFor="domains-group-key"
            >
              <span className="mb-2 block">Nhóm</span>
              <select
                className={adminSelectClass}
                id="domains-group-key"
                name="domainsGroupKey"
                value={filters.domainGroupKey}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    domainGroupKey: event.target.value,
                  }))
                }
              >
                <option style={adminOptionStyle} value="">
                  Tất cả nhóm
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

          <div className="text-sm text-(--admin-text-muted)">
            Tổng cộng: {meta?.total ?? domains.length} tên miền
          </div>

          {error ? (
            <div className="rounded-lg border border-(--admin-danger-soft) bg-(--admin-danger-soft) p-4 text-sm text-(--admin-danger)">
              {error}
            </div>
          ) : null}

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-6 text-sm text-(--admin-text-muted)">
                Đang tải tên miền…
              </div>
            ) : domains.length === 0 ? (
              <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-6 text-sm text-(--admin-text-muted)">
                Không có tên miền khớp bộ lọc hiện tại.
              </div>
            ) : (
              domains.map((domain) => (
                <DomainCard
                  canWrite={canWriteDomains}
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
              Đang tải nhóm tên miền…
            </div>
          ) : domainGroups.length === 0 ? (
            <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-6 text-sm text-(--admin-text-muted)">
              Chưa có nhóm tên miền nào.
            </div>
          ) : (
            domainGroups.map((group) => (
              <DomainGroupCard
                canWrite={canWriteDomains}
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

      {canWriteDomains ? (
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
      ) : null}

      {canWriteDomains ? (
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
      ) : null}

      {canWriteDomains ? (
        <AssignDomainModal
          domain={assigningDomain}
          isSubmitting={isSubmitting}
          open={assigningDomain !== null}
          websites={websites}
          onClose={() => setAssigningDomain(null)}
          onSubmit={handleAssign}
        />
      ) : null}

      <ConfirmActionDialog
        confirmLabel={
          pendingDomainAction?.type === "unassign-domain"
            ? "Gỡ tên miền"
            : "Vô hiệu hóa"
        }
        description={
          pendingDomainAction?.type === "disable-domain" ? (
            <>
              Tên miền <strong>{pendingDomainAction.domain.domain}</strong> sẽ
              chuyển sang trạng thái đã vô hiệu hóa. Đây không phải thao tác
              xóa: bản ghi tên miền vẫn còn trong kho tên miền. Tên miền đã vô
              hiệu hóa không còn được xem là truy cập công khai được.
            </>
          ) : pendingDomainAction?.type === "unassign-domain" ? (
            <>
              Tên miền <strong>{pendingDomainAction.domain.domain}</strong> sẽ
              được gỡ khỏi website đang gán. Bản ghi tên miền vẫn còn trong kho
              tên miền và không bị xóa. Máy chủ vẫn là nơi quyết định.
            </>
          ) : pendingDomainAction?.type === "disable-group" ? (
            <>
              Nhóm tên miền <strong>{pendingDomainAction.group.name}</strong> sẽ
              chuyển sang trạng thái vô hiệu hóa. Thao tác này không tự động
              được mô tả là xóa hoặc vô hiệu hóa từng tên miền thành viên.
            </>
          ) : null
        }
        isSubmitting={isSubmitting}
        open={canWriteDomains && pendingDomainAction !== null}
        title={
          pendingDomainAction?.type === "disable-group"
            ? "Vô hiệu hóa nhóm tên miền?"
            : pendingDomainAction?.type === "unassign-domain"
              ? "Gỡ tên miền khỏi website?"
              : "Vô hiệu hóa tên miền?"
        }
        variant="warning"
        onConfirm={handleConfirmDomainAction}
        onOpenChange={(next) => {
          if (!next) {
            setPendingDomainAction(null);
          }
        }}
      />
    </section>
  );
}
