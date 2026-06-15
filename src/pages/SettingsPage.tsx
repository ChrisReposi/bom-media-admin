import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod/v4";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeAdminPassword } from "@/features/auth/authApi";
import { clearCredentials } from "@/features/auth/authSlice";
import { getApiErrorMessage, normalizeApiError } from "@/lib/api/apiError";
import { cn } from "@/lib/utils";
import { persistor } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const changePasswordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu hiện tại.")
      .max(128, "Mật khẩu hiện tại tối đa 128 ký tự."),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự.")
      .max(128, "Mật khẩu mới tối đa 128 ký tự."),
    confirmNewPassword: z
      .string()
      .min(8, "Vui lòng xác nhận mật khẩu mới.")
      .max(128, "Xác nhận mật khẩu tối đa 128 ký tự."),
    secretCode: z
      .string()
      .min(8, "Vui lòng nhập mã xác thực đổi mật khẩu.")
      .max(256, "Mã xác thực tối đa 256 ký tự."),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmNewPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmNewPassword"],
        message: "Xác nhận mật khẩu mới chưa khớp.",
      });
    }

    if (value.oldPassword === value.newPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
      });
    }
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

const changePasswordResolver = zodResolver(
  changePasswordSchema as unknown as Parameters<typeof zodResolver>[0],
) as unknown as Resolver<ChangePasswordFormValues>;

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-(--admin-danger) mt-1">{message}</p>;
}

function fieldClass(hasError: boolean): string {
  return cn(
    "h-10 border-[var(--admin-border)] bg-[var(--admin-input-bg)] text-[var(--admin-text-strong)]",
    "placeholder:text-[var(--admin-text-muted)] focus-visible:ring-[var(--admin-focus-ring)]",
    hasError && "border-[var(--admin-danger)] focus-visible:ring-red-100",
  );
}

function isChangePasswordVerificationFailure(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    String(error.config?.url ?? "").includes("/admin/auth/change-password")
  );
}

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const admin = useAppSelector((state) => state.auth.admin);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
    clearErrors,
  } = useForm<ChangePasswordFormValues>({
    resolver: changePasswordResolver,
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
      secretCode: "",
    },
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      clearErrors("root");

      const response = await changeAdminPassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
        secretCode: values.secretCode,
      });

      toast.success(
        response.message || "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
      );
      reset();
      dispatch(clearCredentials());
      await persistor.flush();
      navigate("/login", { replace: true });
    } catch (error) {
      if (isChangePasswordVerificationFailure(error)) {
        const message =
          "Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại hoặc mã xác thực.";
        setError("root", { type: "server", message });
        toast.error(message);
        return;
      }

      const normalizedError = normalizeApiError(error);

      if (normalizedError.isAuthError) {
        dispatch(clearCredentials(normalizedError.message));
        await persistor.flush();
        navigate("/login", { replace: true });
        toast.error(normalizedError.message);
        return;
      }

      const message = getApiErrorMessage(error);
      setError("root", { type: "server", message });
      toast.error(message);
    }
  });

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold text-(--admin-text-strong)">
        Cài đặt
      </h1>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,42rem)_minmax(18rem,1fr)]">
        <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--admin-primary-soft) text-(--admin-primary)">
              <KeyRound className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-(--admin-text-strong)">
                Đổi mật khẩu
              </h2>
              <p className="mt-1 text-sm text-(--admin-text-muted)">
                Sau khi đổi mật khẩu thành công, bạn sẽ cần đăng nhập lại để
                tiếp tục sử dụng trang quản trị.
              </p>
            </div>
          </div>

          <form className="space-y-4" noValidate onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Mật khẩu hiện tại</span>
              <div className="relative">
                <Input
                  autoComplete="current-password"
                  className={cn(fieldClass(!!errors.oldPassword), "pr-10")}
                  type={showOldPassword ? "text" : "password"}
                  aria-invalid={!!errors.oldPassword}
                  {...register("oldPassword")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--admin-text-muted) hover:text-(--admin-text-strong) transition-colors"
                  aria-label={
                    showOldPassword
                      ? "Ẩn mật khẩu hiện tại"
                      : "Hiện mật khẩu hiện tại"
                  }
                  onClick={() => setShowOldPassword(!showOldPassword)}
                >
                  {showOldPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <FieldError message={errors.oldPassword?.message} />
            </label>

            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Mật khẩu mới</span>
              <div className="relative">
                <Input
                  autoComplete="new-password"
                  className={cn(fieldClass(!!errors.newPassword), "pr-10")}
                  type={showNewPassword ? "text" : "password"}
                  aria-invalid={!!errors.newPassword}
                  {...register("newPassword")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--admin-text-muted) hover:text-(--admin-text-strong) transition-colors"
                  aria-label={
                    showNewPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"
                  }
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <FieldError message={errors.newPassword?.message} />
            </label>

            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Xác nhận mật khẩu mới</span>
              <div className="relative">
                <Input
                  autoComplete="new-password"
                  className={cn(
                    fieldClass(!!errors.confirmNewPassword),
                    "pr-10",
                  )}
                  type={showConfirmPassword ? "text" : "password"}
                  aria-invalid={!!errors.confirmNewPassword}
                  {...register("confirmNewPassword")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--admin-text-muted) hover:text-(--admin-text-strong) transition-colors"
                  aria-label={
                    showConfirmPassword
                      ? "Ẩn xác nhận mật khẩu mới"
                      : "Hiện xác nhận mật khẩu mới"
                  }
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <FieldError message={errors.confirmNewPassword?.message} />
            </label>

            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Mã xác thực đổi mật khẩu</span>
              <div className="relative">
                <Input
                  autoComplete="off"
                  className={cn(fieldClass(!!errors.secretCode), "pr-10")}
                  type={showSecretCode ? "text" : "password"}
                  aria-invalid={!!errors.secretCode}
                  {...register("secretCode")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--admin-text-muted) hover:text-(--admin-text-strong) transition-colors"
                  aria-label={
                    showSecretCode
                      ? "Ẩn mã xác thực đổi mật khẩu"
                      : "Hiện mã xác thực đổi mật khẩu"
                  }
                  onClick={() => setShowSecretCode(!showSecretCode)}
                >
                  {showSecretCode ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <FieldError message={errors.secretCode?.message} />
            </label>

            <FieldError message={errors.root?.message} />

            <div className="flex flex-col-reverse gap-3 border-t border-(--admin-border) pt-5 sm:flex-row sm:justify-end">
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                {isSubmitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
              </Button>
            </div>
          </form>
        </section>

        <aside className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm">
          <h2 className="text-base font-semibold text-(--admin-text-strong)">
            Tài khoản hiện tại
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-(--admin-text-muted)">Tài khoản</dt>
              <dd className="font-medium text-(--admin-text-strong)">
                {admin?.username ?? "Không xác định"}
              </dd>
            </div>
            <div>
              <dt className="text-(--admin-text-muted)">Vai trò</dt>
              <dd className="font-medium text-(--admin-text-strong)">
                {admin?.role ?? "Không xác định"}
              </dd>
            </div>
            <div>
              <dt className="text-(--admin-text-muted)">Trạng thái</dt>
              <dd className="font-medium text-(--admin-text-strong)">
                {admin?.status ?? "Không xác định"}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
