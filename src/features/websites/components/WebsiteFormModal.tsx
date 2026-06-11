import { X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CreateWebsitePayload,
  DomainGroup,
  UpdateWebsitePayload,
  Website,
} from "@/features/websites/websiteTypes";

type WebsiteFormValues = {
  name: string;
  slug: string;
  defaultTitle: string;
  defaultDescription: string;
  domainGroupKey: string;
};

type WebsiteFormModalProps = {
  open: boolean;
  website?: Website | null;
  domainGroups: DomainGroup[];
  isLoadingDomainGroups?: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateWebsitePayload | UpdateWebsitePayload,
  ) => Promise<void>;
};

const emptyForm: WebsiteFormValues = {
  name: "",
  slug: "",
  defaultTitle: "",
  defaultDescription: "",
  domainGroupKey: "",
};

const adminInputClass = [
  "h-10 w-full border shadow-sm transition-colors",
  "bg-[#EFF4FB] text-[#15253e] placeholder:text-[#aaaaaa]!",
  "border-slate-300 hover:border-slate-400",
  "focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20",
  "dark:bg-[#18191A] dark:text-[#f1f1f1] dark:placeholder:text-[#f1f1f1]",
].join(" ");

export function WebsiteFormModal({
  open,
  website,
  domainGroups,
  isLoadingDomainGroups = false,
  isSubmitting,
  onClose,
  onSubmit,
}: WebsiteFormModalProps) {
  const [form, setForm] = useState<WebsiteFormValues>(emptyForm);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(
      website
        ? {
            name: website.name,
            slug: website.slug,
            defaultTitle: website.defaultTitle ?? "",
            defaultDescription: website.defaultDescription ?? "",
            domainGroupKey: website.domainGroup?.key ?? "",
          }
        : emptyForm,
    );
  }, [open, website]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const slug = slugify(form.slug);
    const selectedDomainGroupKey = form.domainGroupKey.trim().toLowerCase();
    const originalDomainGroupKey =
      website?.domainGroup?.key.trim().toLowerCase() ?? "";

    const payload: CreateWebsitePayload | UpdateWebsitePayload = {
      name,
      slug,
      ...(form.defaultTitle.trim()
        ? { defaultTitle: form.defaultTitle.trim() }
        : {}),
      ...(form.defaultDescription.trim()
        ? { defaultDescription: form.defaultDescription.trim() }
        : {}),
    };

    if (website) {
      if (selectedDomainGroupKey !== originalDomainGroupKey) {
        Object.assign(
          payload,
          selectedDomainGroupKey
            ? { domainGroupKey: selectedDomainGroupKey }
            : { domainGroupId: null },
        );
      }
    } else if (selectedDomainGroupKey) {
      Object.assign(payload, { domainGroupKey: selectedDomainGroupKey });
    }

    await onSubmit(payload);
  }

  const selectedKey = form.domainGroupKey.trim().toLowerCase();
  const selectedGroupInOptions = domainGroups.some(
    (group) => group.key === selectedKey,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        aria-modal="true"
        className="w-full max-w-xl rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-xl"
        role="dialog"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-(--admin-text-strong)">
            {website ? "Sửa website" : "Thêm Website"}
          </h2>
          <Button
            aria-label="Đóng"
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-(--admin-text-strong)">
            <span className="mb-2 block">Tên website</span>
            <Input
              id="nameInput"
              className={adminInputClass}
              required
              value={form.name}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  name: event.target.value,
                  slug: value.slug || slugify(event.target.value),
                }))
              }
            />
          </label>
          <label className="block text-sm font-medium text-(--admin-text-strong)">
            <span className="mb-2 block">Slug</span>
            <Input
              id="slugInput"
              required
              className={adminInputClass}
              value={form.slug}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  slug: slugify(event.target.value),
                }))
              }
            />
          </label>
          <label className="block text-sm font-medium text-(--admin-text-strong)">
            <span className="mb-2 block">Default title</span>
            <Input
              id="defaultTitleInput"
              className={adminInputClass}
              value={form.defaultTitle}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  defaultTitle: event.target.value,
                }))
              }
            />
          </label>
          <label className="block text-sm font-medium text-(--admin-text-strong)">
            <span className="mb-2 block">Default description</span>
            <Input
              id="defaultDescriptionInput"
              className={adminInputClass}
              value={form.defaultDescription}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  defaultDescription: event.target.value,
                }))
              }
            />
          </label>
          <label className="block text-sm font-medium text-(--admin-text-strong) md:col-span-2">
            <span className="mb-2 block">Domain group</span>
            <select
              id="domainGroupKeySelect"
              className={adminInputClass}
              disabled={isLoadingDomainGroups}
              value={form.domainGroupKey}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  domainGroupKey: event.target.value,
                }))
              }
            >
              <option value="">
                {isLoadingDomainGroups
                  ? "Đang tải domain groups..."
                  : "Không dùng domain group"}
              </option>
              {!selectedGroupInOptions && selectedKey ? (
                <option value={selectedKey}>
                  Current group: {website?.domainGroup?.name ?? selectedKey} (
                  {selectedKey})
                </option>
              ) : null}
              {domainGroups.map((group) => (
                <option key={group.id} value={group.key}>
                  {group.name} ({group.key})
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs font-normal text-(--admin-text-muted)">
              Tùy chọn. Website có thể tạo không cần domain group. Nếu chọn
              group, group đó phải tồn tại và đang ACTIVE.
            </span>
          </label>
          <div className="flex gap-2 md:col-span-2 mt-2">
            <Button disabled={isSubmitting} type="submit">
              {website ? "Lưu thay đổi" : "Tạo website"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 120);
}
