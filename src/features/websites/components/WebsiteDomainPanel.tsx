import { Link2Off, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import type { DomainPoolItem } from "@/features/domains/domainTypes";
import type { Website } from "@/features/websites/websiteTypes";

type WebsiteDomainPanelProps = {
  website: Website | null;
  availableDomains: DomainPoolItem[];
  isLoadingDomains: boolean;
  isSubmitting: boolean;
  onAssignDomain: (payload: {
    domainId: string;
    replaceExisting: boolean;
  }) => Promise<void>;
  onUnassignDomain: (domainId: string) => Promise<void>;
};

const selectClass = [
  "h-10 w-full rounded-md border px-3 text-sm shadow-sm outline-none transition-colors",
  "border-slate-300 bg-[#EFF4FB] text-[#15253e]",
  "hover:border-slate-400",
  "focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20",
  "dark:border-[#3A3B3C] dark:bg-[#18191A] dark:text-[#F1F1F1]",
  "dark:hover:border-[#5A5B5C]",
  "dark:focus:border-[#60A5FA] dark:focus:ring-[#60A5FA]/25",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

const optionClass =
  "bg-[#EFF4FB] text-[#15253e] dark:bg-[#18191A] dark:text-[#F1F1F1]";

export function WebsiteDomainPanel({
  website,
  availableDomains,
  isLoadingDomains,
  isSubmitting,
  onAssignDomain,
  onUnassignDomain,
}: WebsiteDomainPanelProps) {
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);

  const currentDomain = useMemo(() => {
    if (!website) return null;

    return (
      website.domains.find((domain) => domain.status === "ACTIVE") ??
      website.domains[0] ??
      null
    );
  }, [website]);

  useEffect(() => {
    setSelectedDomainId("");
    setReplaceExisting(false);
  }, [website?.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDomainId) return;

    await onAssignDomain({
      domainId: selectedDomainId,
      replaceExisting: currentDomain !== null ? replaceExisting : false,
    });
    setSelectedDomainId("");
    setReplaceExisting(false);
  }

  return (
    <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-(--admin-text-strong)">
            Assigned domain
          </h2>
          <p className="mt-1 text-sm text-(--admin-text-muted)">
            Domains are created in the Domains page, then assigned here. Each
            website should have one active domain.
          </p>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/domains">Manage domains</Link>
        </Button>
      </div>

      {!website ? (
        <p className="text-sm text-(--admin-text)">
          Chọn website để gán domain.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-(--admin-border) bg-(--admin-surface-alt) p-3">
            {currentDomain ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-all text-sm font-medium text-(--admin-text-strong)">
                    {currentDomain.domain}
                  </p>
                  <p className="mt-1 text-xs text-(--admin-text-muted)">
                    Status: {currentDomain.status}
                    {currentDomain.isPrimary ? " · Primary" : ""}
                  </p>
                </div>
                <Button
                  disabled={isSubmitting}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => void onUnassignDomain(currentDomain.id)}
                >
                  <Link2Off className="size-4" />
                  Unassign
                </Button>
              </div>
            ) : (
              <p className="text-sm text-(--admin-text-muted)">
                This website has no assigned domain.
              </p>
            )}
          </div>

          <form className="grid gap-3" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Available domain</span>
              <select
                className={selectClass}
                disabled={isLoadingDomains}
                value={selectedDomainId}
                onChange={(event) => setSelectedDomainId(event.target.value)}
              >
                <option className={optionClass} value="">
                  {isLoadingDomains
                    ? "Loading available domains..."
                    : "Select available domain"}
                </option>

                {availableDomains.map((domain) => (
                  <option
                    className={optionClass}
                    key={domain.id}
                    value={domain.id}
                  >
                    {domain.domain}
                    {domain.domainGroup ? ` · ${domain.domainGroup.key}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {currentDomain ? (
              <label className="flex items-start gap-2 rounded-md border border-(--admin-warning-soft) bg-(--admin-warning-soft) p-2 text-sm text-(--admin-text)">
                <input
                  checked={replaceExisting}
                  className="mt-1"
                  type="checkbox"
                  onChange={(event) => setReplaceExisting(event.target.checked)}
                />
                <span>
                  Replace the current domain. The old domain becomes available
                  in the domain pool.
                </span>
              </label>
            ) : null}

            <Button
              className="self-start"
              disabled={
                isSubmitting ||
                !selectedDomainId ||
                (currentDomain !== null && !replaceExisting)
              }
              type="submit"
            >
              <Send className="size-4" />
              {currentDomain ? "Replace domain" : "Assign domain"}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
