import { Calendar } from "lucide-react";

const TimeSelect = () => {
  return (
    <div className="flex h-11 min-w-[320px] max-w-[515px] flex-row items-center justify-between rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-strong)] px-4 text-[var(--admin-text-strong)] shadow-[var(--admin-shadow)]">
      <button className="flex w-[47%] flex-row items-center justify-between gap-3 rounded-[14px] px-1 text-left transition-colors duration-200 hover:text-white">
        <p className="truncate text-sm font-semibold text-[var(--admin-text)]">
          2025-12-14
        </p>
        <Calendar size={16} color="var(--admin-text)" />
      </button>
      <p className="text-sm font-semibold text-[var(--admin-text-muted)]">-</p>
      <button className="flex w-[47%] flex-row items-center justify-between gap-3 rounded-[14px] px-1 text-left transition-colors duration-200 hover:text-white">
        <p className="truncate text-sm font-semibold text-[var(--admin-text)]">
          2026-01-03
        </p>
        <Calendar size={16} color="var(--admin-text)" />
      </button>
    </div>
  );
};

export default TimeSelect;
