import { Edit2, Link2Off, Power, PowerOff, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DomainPoolItem } from "@/features/domains/domainTypes";

import { DomainStatusBadge, DomainUsageBadge } from "./DomainStatusBadge";

type DomainCardProps = {
  domain: DomainPoolItem;
  isBusy: boolean;
  canWrite: boolean;
  onAssign: (domain: DomainPoolItem) => void;
  onEdit: (domain: DomainPoolItem) => void;
  onDisable: (domain: DomainPoolItem) => void;
  onActivate: (domain: DomainPoolItem) => void;
  onUnassign: (domain: DomainPoolItem) => void;
};

export function DomainCard({
  domain,
  isBusy,
  canWrite,
  onAssign,
  onEdit,
  onDisable,
  onActivate,
  onUnassign,
}: DomainCardProps) {
  const canAssign = domain.usageStatus === "AVAILABLE";
  const canDisable = domain.usageStatus === "AVAILABLE";
  const isInUse = domain.usageStatus === "IN_USE";
  const isDisabled = domain.usageStatus === "DISABLED";

  return (
    <article className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-all text-base font-semibold text-(--admin-text-strong)">
              {domain.domain}
            </h3>
            <DomainUsageBadge usageStatus={domain.usageStatus} />
            <DomainStatusBadge status={domain.status} />
          </div>

          <div className="grid gap-1 text-sm text-(--admin-text-muted)">
            <span>
              Group:{" "}
              {domain.domainGroup
                ? `${domain.domainGroup.name} (${domain.domainGroup.key})`
                : "None"}
            </span>
            <span>
              Website:{" "}
              {domain.websiteName
                ? `${domain.websiteName} (${domain.websiteSlug})`
                : "Unassigned"}
            </span>
          </div>
        </div>

        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            {canAssign ? (
              <Button
                disabled={isBusy}
                size="sm"
                type="button"
                onClick={() => onAssign(domain)}
              >
                <Send className="size-4" />
                Assign
              </Button>
            ) : null}

            {isInUse ? (
              <Button
                disabled={isBusy}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onUnassign(domain)}
              >
                <Link2Off className="size-4" />
                Unassign
              </Button>
            ) : null}

            {isDisabled ? (
              <Button
                disabled={isBusy}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onActivate(domain)}
              >
                <Power className="size-4" />
                Activate
              </Button>
            ) : (
              <Button
                disabled={isBusy || !canDisable}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onDisable(domain)}
              >
                <PowerOff className="size-4" />
                Disable
              </Button>
            )}

            <Button
              disabled={isBusy}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onEdit(domain)}
            >
              <Edit2 className="size-4" />
              Edit
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
