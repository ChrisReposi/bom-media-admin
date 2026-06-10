import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react"; // THAY ĐỔI: Thêm Eye và EyeOff
import { useState } from "react"; // THAY ĐỔI: Thêm useState từ react
import { useForm, type Resolver } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod/v4";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeAdminPassword } from "@/features/auth/authApi";
import { clearCredentials } from "@/features/auth/authSlice";
import { getApiErrorMessage } from "@/lib/api/apiError";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const changePasswordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(1, "Current password is required.")
      .max(128, "Current password is too long."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters.")
      .max(128, "New password is too long."),
    confirmNewPassword: z
      .string()
      .min(8, "Confirm the new password.")
      .max(128, "Confirmation is too long."),
    secretCode: z
      .string()
      .min(8, "Secret code is required.")
      .max(256, "Secret code is too long."),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmNewPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmNewPassword"],
        message: "New password confirmation must match.",
      });
    }

    if (value.oldPassword === value.newPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password must differ from the current password.",
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

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const admin = useAppSelector((state) => state.auth.admin);

  // THAY ĐỔI: Khởi tạo các state kiểm soát ẩn/hiện cho từng ô mật khẩu độc lập
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
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
      const response = await changeAdminPassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
        secretCode: values.secretCode,
      });

      toast.success(response.message || "Password changed successfully.");
      reset();
      dispatch(clearCredentials("Password changed. Please login again."));
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  });

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold text-(--admin-text-strong)">
        Settings
      </h1>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,42rem)_minmax(18rem,1fr)]">
        <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--admin-primary-soft) text-(--admin-primary)">
              <KeyRound className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-(--admin-text-strong)">
                Change password
              </h2>
              <p className="mt-1 text-sm text-(--admin-text-muted)">
                You will be logged out after a successful password change.
              </p>
            </div>
          </div>

          <form className="space-y-4" noValidate onSubmit={onSubmit}>
            {/* 1. CURRENT PASSWORD */}
            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Current password</span>
              <div className="relative">
                <Input
                  autoComplete="current-password"
                  className={cn(fieldClass(!!errors.oldPassword), "pr-10")} // Thêm pr-10 để chữ không đè lên icon
                  type={showOldPassword ? "text" : "password"}
                  aria-invalid={!!errors.oldPassword}
                  {...register("oldPassword")}
                />
                <button
                  type="button" // Bắt buộc phải có type="button" để tránh trigger submit form
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--admin-text-muted) hover:text-(--admin-text-strong) transition-colors"
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

            {/* 2. NEW PASSWORD */}
            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">New password</span>
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

            {/* 3. CONFIRM NEW PASSWORD */}
            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Confirm new password</span>
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

            {/* 4. SECRET CODE */}
            <label className="block text-sm font-medium text-(--admin-text-strong)">
              <span className="mb-2 block">Secret code</span>
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

            <div className="flex flex-col-reverse gap-3 border-t border-(--admin-border) pt-5 sm:flex-row sm:justify-end">
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                Change password
              </Button>
            </div>
          </form>
        </section>

        <aside className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm">
          <h2 className="text-base font-semibold text-(--admin-text-strong)">
            Current admin
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-(--admin-text-muted)">Username</dt>
              <dd className="font-medium text-(--admin-text-strong)">
                {admin?.username ?? "Unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-(--admin-text-muted)">Role</dt>
              <dd className="font-medium text-(--admin-text-strong)">
                {admin?.role ?? "Unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-(--admin-text-muted)">Status</dt>
              <dd className="font-medium text-(--admin-text-strong)">
                {admin?.status ?? "Unknown"}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
