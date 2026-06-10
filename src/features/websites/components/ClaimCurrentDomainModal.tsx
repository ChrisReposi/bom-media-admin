import { Globe2, Loader2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Website } from "@/features/websites/websiteTypes";

type ClaimCurrentDomainSubmitPayload = {
  websiteId: string;
  host: string;
  isPrimary: boolean;
};

type ClaimCurrentDomainModalProps = {
  open: boolean;
  websites: Website[];
  selectedWebsiteId: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ClaimCurrentDomainSubmitPayload) => Promise<void>;
};

function getDefaultHost(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.hostname;
}

function normalizeHostInput(value: string): string {
  const trimmedValue = value.trim().toLowerCase();
  const withoutProtocol = trimmedValue
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^\/+/, "");

  return withoutProtocol.split(/[/?#]/)[0]?.replace(/\/+$/, "") ?? "";
}

export function ClaimCurrentDomainModal({
  open,
  websites,
  selectedWebsiteId,
  isSubmitting,
  onClose,
  onSubmit,
}: ClaimCurrentDomainModalProps) {
  const [websiteId, setWebsiteId] = useState("");
  const [host, setHost] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);

  const activeWebsites = useMemo(
    () => websites.filter((website) => website.status === "ACTIVE"),
    [websites],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const selectedWebsiteIsActive = activeWebsites.some(
      (website) => website.id === selectedWebsiteId,
    );

    setWebsiteId(
      selectedWebsiteIsActive
        ? selectedWebsiteId
        : (activeWebsites[0]?.id ?? websites[0]?.id ?? ""),
    );
    setHost(getDefaultHost());
    setIsPrimary(true);
  }, [activeWebsites, open, selectedWebsiteId, websites]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedHost = normalizeHostInput(host);

    if (!websiteId || !normalizedHost) {
      return;
    }

    await onSubmit({
      websiteId,
      host: normalizedHost,
      isPrimary,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <section
        aria-modal="true"
        className="w-full max-w-xl rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-xl"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-(--admin-text-strong)">
              Claim current domain
            </h2>
            <p className="mt-1 text-sm text-(--admin-text-muted)">
              Register the current browser host to an active website.
            </p>
          </div>

          <Button
            aria-label="Close claim domain modal"
            disabled={isSubmitting}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-(--admin-text-strong)">
            <span className="mb-2 block">Website</span>
            <select
              className="h-10 w-full rounded-md border border-(--admin-border) bg-(--admin-input-bg) px-3 text-sm text-(--admin-text-strong) outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--admin-focus-ring)]"
              disabled={isSubmitting || websites.length === 0}
              required
              value={websiteId}
              onChange={(event) => setWebsiteId(event.target.value)}
            >
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.name} ({website.status})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-(--admin-text-strong)">
            <span className="mb-2 block">Host</span>
            <Input
              className="h-10 border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong)"
              placeholder="example.com"
              required
              value={host}
              onBlur={() => setHost(normalizeHostInput(host))}
              onChange={(event) => setHost(event.target.value)}
            />
            <span className="mt-2 block text-xs font-normal text-(--admin-text-muted)">
              Defaults to window.location.hostname. Do not include protocol or
              paths.
            </span>
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-(--admin-text)">
            <input
              checked={isPrimary}
              disabled={isSubmitting}
              type="checkbox"
              onChange={(event) => setIsPrimary(event.target.checked)}
            />
            Set as primary domain
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              disabled={isSubmitting}
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || !websiteId || !host.trim()}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Globe2 className="size-4" />
              )}
              Claim domain
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
