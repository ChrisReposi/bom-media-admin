import type {
  DomainStatus,
  DomainUsageStatus,
} from "@/features/domains/domainTypes";

const usageLabels: Record<DomainUsageStatus, string> = {
  AVAILABLE: "Available",
  IN_USE: "In use",
  DISABLED: "Disabled",
};

const usageClasses: Record<DomainUsageStatus, string> = {
  AVAILABLE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  IN_USE:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  DISABLED:
    "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
};

const statusClasses: Record<DomainStatus, string> = {
  ACTIVE:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  DISABLED:
    "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
};

type DomainUsageBadgeProps = {
  usageStatus: DomainUsageStatus;
};

type DomainStatusBadgeProps = {
  status: DomainStatus;
};

export function DomainUsageBadge({ usageStatus }: DomainUsageBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
        usageClasses[usageStatus],
      ].join(" ")}
    >
      {usageLabels[usageStatus]}
    </span>
  );
}

export function DomainStatusBadge({ status }: DomainStatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
        statusClasses[status],
      ].join(" ")}
    >
      {status}
    </span>
  );
}
