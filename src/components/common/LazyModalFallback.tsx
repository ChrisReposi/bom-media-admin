import { Loader2 } from "lucide-react";

type LazyModalFallbackProps = {
  label: string;
};

export function LazyModalFallback({ label }: LazyModalFallbackProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6"
    >
      <div className="flex items-center gap-3 rounded-lg border border-(--admin-border) bg-(--admin-surface) px-5 py-4 text-sm text-(--admin-text) shadow-(--admin-shadow)">
        <Loader2 className="size-4 animate-spin text-(--admin-primary)" />
        <span>{label}</span>
      </div>
    </div>
  );
}
