import { X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CreateDomainPayload,
  DomainGroup,
  DomainPoolItem,
  DomainStatus,
  UpdateDomainPayload,
} from "@/features/domains/domainTypes";

type DomainFormValues = {
  domain: string;
  domainGroupKey: string;
  status: DomainStatus;
};

type DomainFormModalProps = {
  open: boolean;
  domain?: DomainPoolItem | null;
  domainGroups: DomainGroup[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateDomainPayload | UpdateDomainPayload,
  ) => Promise<void>;
};

const emptyForm: DomainFormValues = {
  domain: "",
  domainGroupKey: "",
  status: "ACTIVE",
};

const inputClass =
  "h-10 w-full border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong)";

export function DomainFormModal({
  open,
  domain,
  domainGroups,
  isSubmitting,
  onClose,
  onSubmit,
}: DomainFormModalProps) {
  const [form, setForm] = useState<DomainFormValues>(emptyForm);

  useEffect(() => {
    if (!open) return;

    setForm(
      domain
        ? {
            domain: domain.domain,
            domainGroupKey: domain.domainGroup?.key ?? "",
            status: domain.status,
          }
        : emptyForm,
    );
  }, [domain, open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDomain = normalizeDomainInput(form.domain);
    if (!normalizedDomain) return;

    const payload: CreateDomainPayload | UpdateDomainPayload = {
      domain: normalizedDomain,
      status: form.status,
      ...(form.domainGroupKey
        ? { domainGroupKey: form.domainGroupKey }
        : domain
          ? { domainGroupId: null }
          : {}),
    };

    await onSubmit(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        aria-modal="true"
        className="w-full max-w-xl rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-xl"
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-(--admin-text-strong)">
            {domain ? "Edit domain" : "Add domain"}
          </h2>
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
          <label
            className="block text-sm font-medium text-(--admin-text-strong)"
            htmlFor="domain-form-domain"
          >
            <span className="mb-2 block">Domain</span>
            <Input
              aria-describedby="domain-form-domain-hint"
              className={inputClass}
              id="domain-form-domain"
              name="domainFormDomain"
              placeholder="127.0.0.1:5500"
              required
              value={form.domain}
              onBlur={() => {
                const normalizedDomain = normalizeDomainInput(form.domain);
                if (normalizedDomain) {
                  setForm((current) => ({
                    ...current,
                    domain: normalizedDomain,
                  }));
                }
              }}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  domain: event.target.value,
                }))
              }
            />
            <span
              className="mt-2 block text-xs font-normal text-(--admin-text-muted)"
              id="domain-form-domain-hint"
            >
              Enter host only, without http:// or paths. Local testing hosts
              must match exactly, e.g. 127.0.0.1:5500.
            </span>
          </label>

          <label
            className="block text-sm font-medium text-(--admin-text-strong)"
            htmlFor="domain-form-group-key"
          >
            <span className="mb-2 block">Domain group</span>
            <select
              className={inputClass}
              id="domain-form-group-key"
              name="domainFormGroupKey"
              value={form.domainGroupKey}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  domainGroupKey: event.target.value,
                }))
              }
            >
              <option value="">No group</option>
              {domainGroups.map((group) => (
                <option key={group.id} value={group.key}>
                  {group.name} ({group.key})
                </option>
              ))}
            </select>
          </label>

          <label
            className="block text-sm font-medium text-(--admin-text-strong)"
            htmlFor="domain-form-status"
          >
            <span className="mb-2 block">Status</span>
            <select
              className={inputClass}
              id="domain-form-status"
              name="domainFormStatus"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as DomainStatus,
                }))
              }
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </label>

          <div className="flex gap-2">
            <Button disabled={isSubmitting} type="submit">
              {domain ? "Save domain" : "Create domain"}
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

function normalizeDomainInput(value: string): string | null {
  const trimmedValue = value.trim().toLowerCase();
  if (!trimmedValue) return null;

  const withoutProtocol = trimmedValue
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^\/+/, "");
  const host = withoutProtocol.split(/[/?#]/)[0]?.replace(/\/+$/, "") ?? "";

  if (!host || host.length > 253 || /\s/.test(host)) {
    return null;
  }

  return host;
}
