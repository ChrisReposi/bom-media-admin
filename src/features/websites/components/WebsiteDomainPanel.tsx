import { Globe2, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Website } from "@/features/websites/websiteTypes";

type WebsiteDomainPanelProps = {
  website: Website | null;
  isSubmitting: boolean;
  onCreateDomain: (payload: {
    domain: string;
    isPrimary: boolean;
  }) => Promise<void>;
  onSetPrimary: (domainId: string) => Promise<void>;
  onDisableDomain: (domainId: string) => Promise<void>;
  onActivateDomain: (domainId: string) => Promise<void>;
};

export function WebsiteDomainPanel({
  website,
  isSubmitting,
  onCreateDomain,
  onSetPrimary,
  onDisableDomain,
  onActivateDomain,
}: WebsiteDomainPanelProps) {
  const [domain, setDomain] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDomain = normalizeWebsiteDomainInput(domain);

    if (!normalizedDomain) {
      return;
    }

    await onCreateDomain({ domain: normalizedDomain, isPrimary });
    setDomain("");
    setIsPrimary(true);
  }

  return (
    <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-4 shadow-sm">
      <div className="flex flex-row justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-(--admin-text-strong)">
          Domains
        </h2>

        <span className="text-sm text-(--admin-text-muted)">
          Tổng cộng: {website?.domains.length} domains
        </span>
      </div>

      {!website ? (
        <p className="text-sm text-(--admin-text)">
          Chọn website để quản lý domain.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="max-h-50 overflow-y-auto pr-2 scrollbar-gutter-stable overscroll-contain">
            <div className="space-y-2">
              {website.domains.map((item) => {
                const isPrimaryActive =
                  item.isPrimary && item.status === "ACTIVE";
                const isDisabled = item.status === "DISABLED";

                return (
                  <div
                    key={item.id}
                    className={[
                      "flex flex-col flex-wrap gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                      isPrimaryActive
                        ? "border-(--admin-primary) bg-(--admin-primary-soft)"
                        : isDisabled
                          ? "border-(--admin-danger) bg-(--admin-danger-soft)"
                          : "border-transparent bg-(--admin-surface-alt)",
                    ].join(" ")}
                  >
                    <div className="flex flex-row items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate">
                        Domain: {item.domain}
                      </span>

                      {item.isPrimary ? (
                        <span className="rounded-full bg-(--admin-primary-soft) px-2 py-1 text-xs text-(--admin-primary)">
                          Primary
                        </span>
                      ) : null}

                      <span
                        className={[
                          "text-xs font-medium",
                          isPrimaryActive
                            ? "text-(--admin-primary)"
                            : isDisabled
                              ? "text-(--admin-danger)"
                              : "text-(--admin-text-muted)",
                        ].join(" ")}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex flex-row items-center gap-2">
                      <Button
                        disabled={isSubmitting || item.isPrimary || isDisabled}
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => void onSetPrimary(item.id)}
                      >
                        <ShieldCheck className="size-4" />
                        Set primary
                      </Button>

                      {isDisabled ? (
                        <Button
                          disabled={isSubmitting}
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => void onActivateDomain(item.id)}
                        >
                          <ShieldCheck className="size-4" />
                          Active
                        </Button>
                      ) : (
                        <Button
                          disabled={isSubmitting}
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => void onDisableDomain(item.id)}
                        >
                          <Trash2 className="size-4" />
                          Disable
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {website.domains.length === 0 ? (
                <p className="text-sm text-(--admin-text)">
                  Website này chưa có domain.
                </p>
              ) : null}
            </div>
          </div>

          <form className="space-y-3 flex flex-col" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Domain mới</span>
              <Input
                placeholder="dimgrey-bat-923172.hostingersite.com"
                value={domain}
                onBlur={() => {
                  const normalizedDomain = normalizeWebsiteDomainInput(domain);
                  if (normalizedDomain) {
                    setDomain(normalizedDomain);
                  }
                }}
                onChange={(event) => setDomain(event.target.value)}
              />
              <span className="mt-2 block text-xs font-normal text-(--admin-text-muted)">
                Nhập domain không bao gồm http:// hoặc https://. Ví dụ:
                dimgrey-bat-923172.hostingersite.com. Khi test local static
                site, thêm đúng host kèm port: 127.0.0.1:5500. localhost:5500
                và 127.0.0.1:5500 là hai domain khác nhau.
              </span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-(--admin-text)">
              <input
                checked={isPrimary}
                type="checkbox"
                onChange={(event) => setIsPrimary(event.target.checked)}
              />
              Set primary domain
            </label>

            <Button
              disabled={isSubmitting || !domain.trim()}
              type="submit"
              className="self-start"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Globe2 className="size-4" />
              )}
              Thêm domain
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}

function normalizeWebsiteDomainInput(value: string): string | null {
  const trimmedValue = value.trim().toLowerCase();

  if (!trimmedValue) {
    return null;
  }

  const withoutProtocol = trimmedValue
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^\/+/, "");
  const host = withoutProtocol.split(/[/?#]/)[0]?.replace(/\/+$/, "") ?? "";

  if (!host || host.length > 253 || /\s/.test(host)) {
    return null;
  }

  return host;
}
