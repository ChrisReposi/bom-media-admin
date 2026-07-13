import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { Dialog } from "radix-ui";
import { type ReactNode, useRef } from "react";

import { Button } from "@/components/ui/button";

type ConfirmActionVariant = "default" | "warning" | "destructive";

type ConfirmActionDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmActionVariant;
  isSubmitting?: boolean;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
};

const iconWrapClass: Record<ConfirmActionVariant, string> = {
  default: "bg-(--admin-info-soft) text-(--admin-info)",
  warning: "bg-(--admin-warning-soft) text-(--admin-warning)",
  destructive: "bg-(--admin-danger-soft) text-(--admin-danger)",
};

const confirmButtonVariant: Record<
  ConfirmActionVariant,
  "default" | "destructive"
> = {
  default: "default",
  warning: "default",
  destructive: "destructive",
};

/**
 * Shared, accessible confirmation dialog for destructive/irreversible-ish admin
 * actions. Presentation only — it holds no website/domain business logic; the
 * caller owns the action, submitting state and refetch. Built on the existing
 * radix-ui Dialog primitive (focus trap, Escape, focus restore, scroll lock).
 */
export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Hủy",
  variant = "default",
  isSubmitting = false,
  onConfirm,
  onOpenChange,
}: ConfirmActionDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmLockRef = useRef(false);
  const Icon = variant === "default" ? Info : AlertTriangle;

  function handleOpenChange(next: boolean): void {
    // Never allow closing (Escape/backdrop/Close) while a request is in flight.
    if (isSubmitting) {
      return;
    }

    onOpenChange(next);
  }

  async function handleConfirm(): Promise<void> {
    if (confirmLockRef.current || isSubmitting) {
      return;
    }

    confirmLockRef.current = true;

    try {
      await onConfirm();
    } finally {
      confirmLockRef.current = false;
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-(--admin-overlay) data-[state=open]:animate-in data-[state=open]:fade-in motion-reduce:animate-none" />
        <Dialog.Content
          aria-describedby="confirm-action-description"
          aria-labelledby="confirm-action-title"
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-(--admin-border) bg-(--admin-surface) p-5 shadow-(--admin-shadow) duration-(--admin-motion-fast) data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 motion-reduce:animate-none"
          onEscapeKeyDown={(event) => {
            if (isSubmitting) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (isSubmitting) {
              event.preventDefault();
            }
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancelButtonRef.current?.focus();
          }}
        >
          <div className="flex gap-3">
            <span
              className={[
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                iconWrapClass[variant],
              ].join(" ")}
            >
              <Icon className="size-5" />
            </span>

            <div className="min-w-0 space-y-2">
              <Dialog.Title
                className="text-lg font-semibold text-(--admin-text-strong)"
                id="confirm-action-title"
              >
                {title}
              </Dialog.Title>
              <Dialog.Description
                className="text-sm leading-6 text-(--admin-text)"
                id="confirm-action-description"
              >
                {description}
              </Dialog.Description>
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button
                ref={cancelButtonRef}
                disabled={isSubmitting}
                type="button"
                variant="outline"
              >
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              disabled={isSubmitting}
              type="button"
              variant={confirmButtonVariant[variant]}
              onClick={() => void handleConfirm()}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : null}
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
