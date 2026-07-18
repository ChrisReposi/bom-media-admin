import { BadgeCheck, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { summarizeEvidenceSnapshot } from "@/features/websites/canonicalShareLinkPolicy";
import type { CanonicalShareLinkResponse } from "@/features/websites/websiteTypes";

type CanonicalShareLinkCardProps = {
  result: CanonicalShareLinkResponse;
  websiteName: string | null;
};

/**
 * Displays the canonical URL exactly as the backend returned it — the value
 * is recorded in DMCA/provenance filings, so it must never be rebuilt or
 * normalized on the client.
 */
export function CanonicalShareLinkCard({
  result,
  websiteName,
}: CanonicalShareLinkCardProps) {
  const videoTitle = result.shareLink.videos[0]?.title ?? null;
  const snapshotSummary = summarizeEvidenceSnapshot(result.evidenceSnapshot);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(result.publicUrl);
      toast.success("Đã sao chép URL canonical.");
    } catch {
      toast.error("Không thể sao chép URL. Vui lòng copy thủ công.");
    }
  }

  return (
    <section className="w-full rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm lg:w-96">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-(--admin-primary) px-2 py-0.5 text-xs font-semibold text-(--admin-contrast)">
            <BadgeCheck className="size-3.5" />
            Canonical
          </span>
          <span className="rounded-full border border-(--admin-border) px-2 py-0.5 text-xs font-medium text-(--admin-text-muted)">
            {result.outcome === "CREATED" ? "Vừa tạo" : "Dùng lại"}
          </span>
        </div>

        <Button type="button" onClick={() => void handleCopy()}>
          <Copy className="size-4" />
          Sao chép URL
        </Button>
      </div>

      <div className="space-y-3">
        <Input
          aria-label="URL canonical"
          id="canonical-share-link-public-url"
          name="canonicalShareLinkPublicUrl"
          readOnly
          value={result.publicUrl}
        />

        <dl className="space-y-1 text-sm text-(--admin-text)">
          {websiteName ? (
            <div className="flex gap-2">
              <dt className="shrink-0 text-(--admin-text-muted)">Website:</dt>
              <dd className="min-w-0 break-words">{websiteName}</dd>
            </div>
          ) : null}
          {videoTitle ? (
            <div className="flex gap-2">
              <dt className="shrink-0 text-(--admin-text-muted)">Video:</dt>
              <dd className="min-w-0 break-words">{videoTitle}</dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt className="shrink-0 text-(--admin-text-muted)">Alias:</dt>
            <dd className="font-mono">{result.alias}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-(--admin-text-muted)">Tạo lúc:</dt>
            <dd>{result.canonicalCreatedAt}</dd>
          </div>
          {snapshotSummary ? (
            <div className="flex gap-2">
              <dt className="shrink-0 text-(--admin-text-muted)">Snapshot:</dt>
              <dd className="min-w-0 break-words">{snapshotSummary}</dd>
            </div>
          ) : null}
        </dl>

        {result.rawToken ? (
          <p className="rounded-md border border-(--admin-warning-soft) bg-(--admin-warning-soft) p-2 text-xs text-(--admin-text)">
            Raw token chỉ hiển thị một lần và không được lưu trong Admin Web:{" "}
            <span className="font-mono break-all">{result.rawToken}</span>
          </p>
        ) : null}

        <p className="text-xs text-(--admin-text-muted)">
          URL canonical ổn định cho cặp website–video này và được giữ nguyên
          byte-for-byte cho hồ sơ bản quyền. Nó không tự chứng minh quyền sở hữu
          và không bảo đảm kết quả xử lý DMCA.
        </p>
      </div>
    </section>
  );
}
