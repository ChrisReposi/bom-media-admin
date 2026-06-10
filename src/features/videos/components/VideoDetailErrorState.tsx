import { ArrowLeft, RefreshCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

type VideoDetailErrorStateProps = {
  message: string;
  onBack: () => void;
  onRetry: () => void;
};

export function VideoDetailErrorState({
  message,
  onBack,
  onRetry,
}: VideoDetailErrorStateProps) {
  return (
    <section className="flex min-h-[420px] items-center justify-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]">
          <TriangleAlert className="size-6" />
        </div>

        <h1 className="mt-4 text-xl font-semibold text-[var(--admin-text-strong)]">
          Không tải được video
        </h1>
        <p className="mt-2 text-sm text-[var(--admin-text)]">{message}</p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Quay lại
          </Button>
          <Button type="button" onClick={onRetry}>
            <RefreshCcw className="size-4" />
            Thử lại
          </Button>
        </div>
      </div>
    </section>
  );
}
