import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PasswordVisibilityButton } from "@/components/common/PasswordVisibilityButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeApiError } from "@/lib/api/apiError";
import { persistor } from "@/store";
import { useAppDispatch } from "@/store/hooks";

import { changeOwnAdminPassword } from "../authApi";
import { publishAuthEvent } from "../authCrossTab";
import { clearCredentials } from "../authSlice";

export function OwnPasswordForm({ forced = false }: { forced?: boolean }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("Mật khẩu mới phải có từ 12 đến 128 ký tự.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Xác nhận mật khẩu mới chưa khớp.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await changeOwnAdminPassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      dispatch(clearCredentials());
      publishAuthEvent({ type: "AUTH_CLEARED" });
      await persistor.flush();
      toast.success(
        result.message || "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
      );
      navigate("/login", { replace: true });
    } catch (caught) {
      const normalized = normalizeApiError(caught);
      if (normalized.isAuthError) {
        dispatch(clearCredentials(normalized.message));
        publishAuthEvent({ type: "AUTH_CLEARED", reason: normalized.message });
        await persistor.flush();
        navigate("/login", { replace: true });
        return;
      }
      const message =
        normalized.code === "ADMIN_CURRENT_PASSWORD_INVALID"
          ? "Mật khẩu hiện tại không đúng."
          : normalized.message;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-(--admin-text-strong)">
          {forced ? "Đổi mật khẩu tạm thời" : "Đổi mật khẩu"}
        </h2>
        <p className="mt-1 text-sm text-(--admin-text-muted)">
          {forced
            ? "Bạn phải đặt mật khẩu riêng trước khi sử dụng các chức năng quản trị."
            : "Đổi mật khẩu sẽ thu hồi mọi phiên của tài khoản này và yêu cầu đăng nhập lại."}
        </p>
      </div>
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <PasswordField
          autoComplete="current-password"
          id="own-password-current"
          label="Mật khẩu hiện tại"
          name="ownPasswordCurrent"
          show={showCurrent}
          value={currentPassword}
          onChange={setCurrentPassword}
          onToggle={() => setShowCurrent((value) => !value)}
        />
        <PasswordField
          autoComplete="new-password"
          id="own-password-new"
          label="Mật khẩu mới (12–128 ký tự)"
          name="ownPasswordNew"
          show={showNew}
          value={newPassword}
          onChange={setNewPassword}
          onToggle={() => setShowNew((value) => !value)}
        />
        <PasswordField
          autoComplete="new-password"
          id="own-password-confirmation"
          label="Xác nhận mật khẩu mới"
          name="ownPasswordConfirmation"
          show={showNew}
          value={confirmation}
          onChange={setConfirmation}
          onToggle={() => setShowNew((value) => !value)}
        />
        {error ? (
          <p role="alert" className="text-sm text-(--admin-danger)">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end border-t border-(--admin-border) pt-4">
          <Button
            disabled={submitting || !currentPassword || !newPassword}
            type="submit"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            {submitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function PasswordField(props: {
  /**
   * Owned by the call site: deriving the id from the (Vietnamese) label text
   * collapses diacritics and could silently collide if a label is reworded.
   */
  id: string;
  name: string;
  label: string;
  value: string;
  show: boolean;
  autoComplete: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  const id = props.id;
  return (
    <div>
      <label
        className="mb-2 block text-sm font-medium text-(--admin-text-strong)"
        htmlFor={id}
      >
        {props.label}
      </label>
      <div className="relative">
        <Input
          required
          id={id}
          name={props.name}
          autoComplete={props.autoComplete}
          className="h-10 pr-10"
          maxLength={128}
          type={props.show ? "text" : "password"}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
        <PasswordVisibilityButton
          hideLabel={`Ẩn ${props.label.toLowerCase()}`}
          showLabel={`Hiện ${props.label.toLowerCase()}`}
          visible={props.show}
          onToggle={props.onToggle}
        />
      </div>
    </div>
  );
}
