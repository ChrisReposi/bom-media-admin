import { X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  AssignDomainPayload,
  DomainPoolItem,
  WebsiteOption,
} from "@/features/domains/domainTypes";

type AssignDomainModalProps = {
  open: boolean;
  domain: DomainPoolItem | null;
  websites: WebsiteOption[];
  isSubmitting: boolean;
  initialWebsiteId?: string;
  onClose: () => void;
  onSubmit: (payload: AssignDomainPayload) => Promise<void>;
};

const inputClass =
  "h-10 w-full border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong)";

export function AssignDomainModal({
  open,
  domain,
  websites,
  isSubmitting,
  initialWebsiteId = "",
  onClose,
  onSubmit,
}: AssignDomainModalProps) {
  const [websiteId, setWebsiteId] = useState(initialWebsiteId);
  const [replaceExisting, setReplaceExisting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setWebsiteId(initialWebsiteId);
    setReplaceExisting(false);
  }, [initialWebsiteId, open]);

  const selectedWebsite = useMemo(
    () => websites.find((website) => website.id === websiteId) ?? null,
    [websiteId, websites],
  );
  const selectedWebsiteHasDomain =
    selectedWebsite?.domains.some((item) => item.status === "ACTIVE") ?? false;

  if (!open || !domain) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!websiteId) return;

    await onSubmit({
      websiteId,
      replaceExisting: selectedWebsiteHasDomain ? replaceExisting : false,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        aria-modal="true"
        className="w-full max-w-xl rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-xl"
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-(--admin-text-strong)">
              Assign domain
            </h2>
            <p className="mt-1 break-all text-sm text-(--admin-text-muted)">
              {domain.domain}
            </p>
          </div>
          <Button
            aria-label="Close"
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-(--admin-text-strong)">
            <span className="mb-2 block">Website</span>
            <select
              className={inputClass}
              required
              value={websiteId}
              onChange={(event) => {
                setWebsiteId(event.target.value);
                setReplaceExisting(false);
              }}
            >
              <option value="">Select website</option>
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.name} ({website.slug})
                </option>
              ))}
            </select>
          </label>

          {selectedWebsiteHasDomain ? (
            <label className="flex items-start gap-2 rounded-md border border-(--admin-warning-soft) bg-(--admin-warning-soft) p-3 text-sm text-(--admin-text)">
              <input
                checked={replaceExisting}
                className="mt-1"
                type="checkbox"
                onChange={(event) => setReplaceExisting(event.target.checked)}
              />
              <span>
                This website already has an active domain. Replace it and make
                the old domain available again.
              </span>
            </label>
          ) : null}

          <div className="flex gap-2">
            <Button
              disabled={
                isSubmitting ||
                !websiteId ||
                (selectedWebsiteHasDomain && !replaceExisting)
              }
              type="submit"
            >
              Assign domain
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
