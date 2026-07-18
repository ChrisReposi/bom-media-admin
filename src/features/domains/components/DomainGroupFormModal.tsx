import { X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CreateDomainGroupPayload,
  DomainGroup,
  DomainGroupStatus,
  UpdateDomainGroupPayload,
} from "@/features/domains/domainTypes";

type DomainGroupFormValues = {
  key: string;
  name: string;
  description: string;
  status: DomainGroupStatus;
};

type DomainGroupFormModalProps = {
  open: boolean;
  group?: DomainGroup | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateDomainGroupPayload | UpdateDomainGroupPayload,
  ) => Promise<void>;
};

const emptyForm: DomainGroupFormValues = {
  key: "",
  name: "",
  description: "",
  status: "ACTIVE",
};

const inputClass =
  "h-10 w-full border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong)";

export function DomainGroupFormModal({
  open,
  group,
  isSubmitting,
  onClose,
  onSubmit,
}: DomainGroupFormModalProps) {
  const [form, setForm] = useState<DomainGroupFormValues>(emptyForm);

  useEffect(() => {
    if (!open) return;

    setForm(
      group
        ? {
            key: group.key,
            name: group.name,
            description: group.description ?? "",
            status: group.status,
          }
        : emptyForm,
    );
  }, [group, open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      key: slugifyKey(form.key),
      name: form.name.trim(),
      ...(form.description.trim()
        ? { description: form.description.trim() }
        : {}),
      status: form.status,
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
          <h2 className="text-lg font-semibold text-(--admin-text-strong)">
            {group ? "Edit domain group" : "Add domain group"}
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
            htmlFor="domain-group-form-key"
          >
            <span className="mb-2 block">Key</span>
            <Input
              className={inputClass}
              id="domain-group-form-key"
              name="domainGroupFormKey"
              placeholder="sml"
              required
              value={form.key}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  key: slugifyKey(event.target.value),
                }))
              }
            />
          </label>

          <label
            className="block text-sm font-medium text-(--admin-text-strong)"
            htmlFor="domain-group-form-name"
          >
            <span className="mb-2 block">Name</span>
            <Input
              className={inputClass}
              id="domain-group-form-name"
              name="domainGroupFormName"
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>

          <label
            className="block text-sm font-medium text-(--admin-text-strong)"
            htmlFor="domain-group-form-description"
          >
            <span className="mb-2 block">Description</span>
            <Input
              className={inputClass}
              id="domain-group-form-description"
              name="domainGroupFormDescription"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>

          <label
            className="block text-sm font-medium text-(--admin-text-strong)"
            htmlFor="domain-group-form-status"
          >
            <span className="mb-2 block">Status</span>
            <select
              className={inputClass}
              id="domain-group-form-status"
              name="domainGroupFormStatus"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as DomainGroupStatus,
                }))
              }
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </label>

          <div className="flex gap-2">
            <Button disabled={isSubmitting} type="submit">
              {group ? "Save group" : "Create group"}
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

function slugifyKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}
