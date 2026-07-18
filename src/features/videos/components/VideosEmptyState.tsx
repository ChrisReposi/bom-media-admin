import { Film, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type VideosEmptyStateProps = {
  onCreate?: () => void;
};

export function VideosEmptyState({ onCreate }: VideosEmptyStateProps) {
  return (
    <section className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--admin-border-strong)] bg-[var(--admin-surface)] px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-[var(--admin-primary-soft)] text-[var(--admin-primary)]">
        <Film className="size-7" />
      </div>

      <h2 className="mt-5 text-lg font-semibold text-[var(--admin-text-strong)]">
        Chưa có video
      </h2>
      <p className="mt-2 max-w-md text-sm text-[var(--admin-text)]">
        Upload file lên server storage hoặc tạo video thủ công bằng URL phát để
        bắt đầu quản lý thư viện.
      </p>

      {onCreate ? (
        <Button className="mt-6" type="button" onClick={onCreate}>
          <Plus className="size-4" />
          Thêm video
        </Button>
      ) : null}
    </section>
  );
}
