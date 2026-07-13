import { Eye, EyeOff } from "lucide-react";

type PasswordVisibilityButtonProps = {
  visible: boolean;
  onToggle: () => void;
  showLabel?: string;
  hideLabel?: string;
  disabled?: boolean;
};

/**
 * Presentation-only show/hide toggle for password inputs. Holds no auth or form
 * logic; the caller owns the boolean state and wires it to the input `type`.
 * Intended to sit inside a `relative` field wrapper.
 */
export function PasswordVisibilityButton({
  visible,
  onToggle,
  showLabel = "Hiện mật khẩu",
  hideLabel = "Ẩn mật khẩu",
  disabled = false,
}: PasswordVisibilityButtonProps) {
  return (
    <button
      aria-label={visible ? hideLabel : showLabel}
      className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-(--admin-text-muted) transition-colors hover:text-(--admin-text-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-focus-ring) disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      title={visible ? hideLabel : showLabel}
      type="button"
      onClick={onToggle}
    >
      {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}
