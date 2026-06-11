import { Edit2, PowerOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DomainGroup } from "@/features/domains/domainTypes";

type DomainGroupCardProps = {
  group: DomainGroup;
  isBusy: boolean;
  onEdit: (group: DomainGroup) => void;
  onDisable: (group: DomainGroup) => void;
};

export function DomainGroupCard({
  group,
  isBusy,
  onEdit,
  onDisable,
}: DomainGroupCardProps) {
  const isDisabled = group.status === "DISABLED";

  return (
    <article className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-(--admin-text-strong)">
              {group.name}
            </h3>
            <span className="rounded-full border border-(--admin-border) bg-(--admin-surface-alt) px-2 py-1 text-xs text-(--admin-text-muted)">
              {group.key}
            </span>
            <span
              className={[
                "rounded-full border px-2 py-1 text-xs font-medium",
                isDisabled
                  ? "border-slate-200 bg-slate-100 text-slate-600"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
              ].join(" ")}
            >
              {group.status}
            </span>
          </div>
          {group.description ? (
            <p className="text-sm text-(--admin-text-muted)">
              {group.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isBusy}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onEdit(group)}
          >
            <Edit2 className="size-4" />
            Edit
          </Button>
          <Button
            disabled={isBusy || isDisabled}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onDisable(group)}
          >
            <PowerOff className="size-4" />
            Disable
          </Button>
        </div>
      </div>
    </article>
  );
}
