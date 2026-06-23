import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreateShareLinkResponse } from "@/features/websites/websiteTypes";

type CreatedShareLinkCardProps = {
  shareLink: CreateShareLinkResponse;
};

export function CreatedShareLinkCard({ shareLink }: CreatedShareLinkCardProps) {
  async function handleCopy(): Promise<void> {
    if (!shareLink.publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink.publicUrl);
      toast.success("Đã sao chép public URL.");
    } catch {
      toast.error("Không thể sao chép URL. Vui lòng copy thủ công.");
    }
  }

  return (
    <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm min-w-[35%]">
      <div className="flex flex-row items-start justify-between mb-7">
        <div className="flex items-center gap-2">
          <ExternalLink className="size-4 text-(--admin-primary)" />
          <h2 className="text-lg font-semibold text-(--admin-text-strong)">
            Public URL vừa tạo
          </h2>
        </div>

        <Button type="button" onClick={() => void handleCopy()}>
          <Copy className="size-4" />
          Copy public URL
        </Button>
      </div>

      {shareLink.publicUrl ? (
        <div className="space-y-3">
          <Input readOnly value={shareLink.publicUrl} />
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-(--admin-warning-soft) bg-(--admin-warning-soft) p-3 text-sm text-(--admin-text)">
          <p>Website chưa có domain active nên chưa thể tạo URL public.</p>
          <p>
            Raw token chỉ hiển thị trong phiên tạo link này:{" "}
            <span className="font-mono">{shareLink.rawToken}</span>
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-(--admin-text-muted)">
        Raw token chỉ hiển thị một lần và không được lưu trong Admin Web.
      </p>
    </section>
  );
}
