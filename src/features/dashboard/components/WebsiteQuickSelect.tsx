import { Check } from "lucide-react";

import type { Website } from "@/features/websites/websiteTypes";

type WebsiteQuickSelectProps = {
  websites: Website[];
  selectedWebsiteId: string;
  onChange: (websiteId: string) => void;
  totalWebsites?: number;
  searchQuery?: string;
};

export function WebsiteQuickSelect({
  websites,
  selectedWebsiteId,
  onChange,
  searchQuery,
}: WebsiteQuickSelectProps) {
  if (websites.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-(--admin-border) p-4 text-sm text-(--admin-text)">
        {searchQuery
          ? `Không tìm thấy website phù hợp với từ khóa "${searchQuery}".`
          : "Chưa có website active để tạo share link."}
      </div>
    );
  }

  const formatDomainUrl = (domain: string) => {
    if (!domain) return "";
    return domain.startsWith("http://") || domain.startsWith("https://")
      ? domain
      : `https://${domain}`;
  };

  return (
    <div className="grid gap-3 md:grid-cols-1 max-h-105 overflow-y-auto pr-2 scrollbar-gutter-stable md:max-h-172.5 xl:max-h-140">
      {websites.map((website) => {
        const primaryDomain =
          website.domains.find(
            (domain) => domain.isPrimary && domain.status === "ACTIVE",
          ) ??
          website.domains.find((domain) => domain.status === "ACTIVE") ??
          null;
        const isSelected = selectedWebsiteId === website.id;

        return (
          <div
            key={website.id}
            aria-pressed={isSelected}
            className={[
              "flex items-start gap-3 rounded-lg border py-2 px-4 text-left transition cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-focus-ring)",
              isSelected
                ? "border-(--admin-primary) bg-(--admin-primary-soft)"
                : "border-(--admin-border) bg-(--admin-surface-alt) hover:border-(--admin-border-strong)",
            ].join(" ")}
            role="button"
            tabIndex={0}
            onClick={() => onChange(website.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange(website.id);
              }
            }}
          >
            <span
              aria-hidden="true"
              className={[
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                isSelected
                  ? "border-(--admin-primary) bg-(--admin-primary) text-(--admin-contrast)"
                  : "border-(--admin-border-strong) text-transparent",
              ].join(" ")}
            >
              <Check className="size-3.5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-(--admin-text-strong)">
                {website.name}
              </span>

              <span className="mt-1 block truncate text-sm text-(--admin-text)">
                Domain:{" "}
                {primaryDomain?.domain ? (
                  <a
                    href={formatDomainUrl(primaryDomain.domain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--admin-primary) hover:underline inline-flex items-center gap-1 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {primaryDomain.domain}
                  </a>
                ) : (
                  <span className="text-(--admin-text-muted)">
                    Chưa có domain active — chưa thể tạo URL public
                  </span>
                )}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
