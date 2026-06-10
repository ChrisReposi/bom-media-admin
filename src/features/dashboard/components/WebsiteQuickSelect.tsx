import { Globe2 } from "lucide-react";

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
    <div className="grid gap-3 md:grid-cols-1">
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
            className={[
              "rounded-lg border py-2 px-4 text-left transition cursor-pointer select-none",
              isSelected
                ? "border-(--admin-primary) bg-(--admin-primary-soft)"
                : "border-(--admin-border) bg-(--admin-surface-alt) hover:border-(--admin-border-strong)",
            ].join(" ")}
            role="button"
            tabIndex={0}
            onClick={() => onChange(website.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onChange(website.id);
              }
            }}
          >
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
                    Chưa ghép domain
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
