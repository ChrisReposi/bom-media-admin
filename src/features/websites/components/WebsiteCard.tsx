import { Globe2, Pencil, Power, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Website } from "@/features/websites/websiteTypes";

type WebsiteCardProps = {
  website: Website;
  isSelected: boolean;
  canWrite: boolean;
  onSelect: (website: Website) => void;
  onEdit: (website: Website) => void;
  onDisable: (website: Website) => void;
  onActivate: (website: Website) => void;
};

export function WebsiteCard({
  website,
  isSelected,
  canWrite,
  onSelect,
  onEdit,
  onDisable,
  onActivate,
}: WebsiteCardProps) {
  const primaryDomain =
    website.domains.find(
      (domain) => domain.isPrimary && domain.status === "ACTIVE",
    ) ??
    website.domains.find((domain) => domain.status === "ACTIVE") ??
    null;

  const formatDomainUrl = (domain: string) => {
    if (!domain) return "";
    return domain.startsWith("http://") || domain.startsWith("https://")
      ? domain
      : `https://${domain}`;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-600 dark:text-green-400 font-semibold";
      case "DISABLED":
        return "text-red-600 dark:text-red-400 font-semibold";
      default:
        return "text-(--admin-text-muted)";
    }
  };

  return (
    <article
      className={[
        "rounded-lg border bg-(--admin-surface) p-4 shadow-sm transition flex flex-row gap-4",
        isSelected
          ? "border-(--admin-primary)"
          : "border-(--admin-border) hover:border-(--admin-border-strong)",
      ].join(" ")}
    >
      <div
        className="flex-1 min-w-0 text-left cursor-pointer"
        onClick={() => onSelect(website)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect(website);
        }}
      >
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
            <span className="text-(--admin-text-muted)">Chưa ghép domain</span>
          )}
        </span>

        <span className="mt-2 block text-xs text-(--admin-text-muted)">
          {website.slug} ·{" "}
          <span className={getStatusClass(website.status)}>
            {website.status}
          </span>
        </span>

        {website.domainGroup ? (
          <span className="mt-2 inline-flex w-fit rounded-full bg-(--admin-primary-soft) px-2 py-1 text-xs font-medium text-(--admin-primary)">
            Group: {website.domainGroup.key}
          </span>
        ) : null}
      </div>

      {canWrite ? (
        <div className="flex flex-col gap-2 justify-start shrink-0">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onEdit(website)}
          >
            <Pencil className="size-4" />
            Sửa
          </Button>
          {website.status === "DISABLED" ? (
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onActivate(website)}
            >
              <Power className="size-4" />
              Active
            </Button>
          ) : (
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onDisable(website)}
            >
              <Trash2 className="size-4" />
              Disable
            </Button>
          )}
        </div>
      ) : null}
    </article>
  );
}
