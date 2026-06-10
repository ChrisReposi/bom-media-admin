import { AlertTriangle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type VideosErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function VideosErrorState({ message, onRetry }: VideosErrorStateProps) {
  return (
    <section className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-6 py-12 text-center shadow-sm">
      <div className="flex size-14 items-center justify-center rounded-full bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]">
        <AlertTriangle className="size-7" />
      </div>

      <h2 className="mt-5 text-lg font-semibold text-[var(--admin-text-strong)]">
        Không thể tải danh sách video
      </h2>
      <p className="mt-2 max-w-md text-sm text-[var(--admin-text)]">
        {message}
      </p>

      <Button
        className="mt-6"
        type="button"
        variant="outline"
        onClick={onRetry}
      >
        <RefreshCcw className="size-4" />
        Thử lại
      </Button>
    </section>
  );
}
