import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod/v4";

import { PasswordVisibilityButton } from "@/components/common/PasswordVisibilityButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAdminThunk } from "@/features/auth/authSlice";
import { toggleTheme } from "@/features/theme/themeSlice";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Tài khoản phải có ít nhất 3 ký tự")
    .max(32, "Tài khoản tối đa 32 ký tự")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Tài khoản chỉ được chứa chữ cái, số và dấu gạch dưới",
    ),
  password: z
    .string()
    .min(1, "Mật khẩu không được bỏ trống")
    .max(128, "Mật khẩu tối đa 128 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// @hookform/resolvers currently types Zod v4 core with a narrower version literal
// than the installed Zod package, while the runtime schema contract is compatible.
const loginResolver = zodResolver(
  loginSchema as unknown as Parameters<typeof zodResolver>[0],
) as unknown as Resolver<LoginFormValues>;

function fieldClass(hasError: boolean): string {
  return cn(
    "h-11 border-(--admin-border) bg-(--admin-input-bg) text-(--admin-text-strong)",
    "placeholder:text-(--admin-text-muted) focus-visible:ring-(--admin-focus-ring)",
    hasError &&
      "border-(--admin-danger) focus-visible:ring-(--admin-danger)/30",
  );
}

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const submitLockRef = useRef(false);
  const [showPassword, setShowPassword] = useState(false);

  const themeMode = useAppSelector((state) => state.theme.mode);
  const { error, isAuthenticated, status } = useAppSelector(
    (state) => state.auth,
  );
  const isDark = themeMode === "dark";
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/";

  const {
    clearErrors,
    formState: { errors, isValid },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormValues>({
    resolver: loginResolver,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [from, isAuthenticated, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    if (submitLockRef.current || status === "loading") return;

    submitLockRef.current = true;

    try {
      clearErrors("root");

      const result = await dispatch(loginAdminThunk(values));

      if (loginAdminThunk.fulfilled.match(result)) {
        navigate(from, { replace: true });
        return;
      }

      setError("root", {
        type: "server",
        message:
          typeof result.payload === "string"
            ? result.payload
            : "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.",
      });
    } finally {
      submitLockRef.current = false;
    }
  });

  const visibleError =
    errors.root?.message ?? (status === "error" ? error : null);
  const isLoading = status === "loading";

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10 text-(--admin-text-strong)">
      <section className="w-full max-w-md rounded-xl border border-(--admin-border) bg-(--admin-surface) p-7 shadow-(--admin-shadow) md:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--admin-text-muted)">
              BOM Media
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-(--admin-text-strong)">
              Đăng nhập
            </h1>
            <p className="mt-1 text-sm text-(--admin-text-muted)">
              Video Share CMS
            </p>
          </div>

          <button
            aria-label={
              isDark
                ? "Chuyển sang giao diện sáng"
                : "Chuyển sang giao diện tối"
            }
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-(--admin-border) bg-(--admin-surface-alt) text-(--admin-text) transition-colors hover:border-(--admin-border-strong) hover:text-(--admin-text-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--admin-focus-ring)"
            type="button"
            onClick={() => dispatch(toggleTheme())}
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </div>

        <form className="space-y-4" noValidate onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-(--admin-text-strong)"
              htmlFor="username"
            >
              Tài khoản
            </label>
            <Input
              id="username"
              aria-describedby={errors.username ? "username-error" : undefined}
              aria-invalid={!!errors.username}
              autoCapitalize="none"
              autoComplete="username"
              className={fieldClass(!!errors.username)}
              placeholder="Nhập tài khoản"
              spellCheck={false}
              {...register("username")}
            />
            {errors.username?.message ? (
              <p className="text-sm text-(--admin-danger)" id="username-error">
                {errors.username.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-(--admin-text-strong)"
              htmlFor="password"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <Input
                id="password"
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                aria-invalid={!!errors.password}
                autoComplete="current-password"
                className={cn(fieldClass(!!errors.password), "pr-11")}
                placeholder="Nhập mật khẩu"
                type={showPassword ? "text" : "password"}
                {...register("password")}
              />
              <PasswordVisibilityButton
                visible={showPassword}
                onToggle={() => setShowPassword((previous) => !previous)}
              />
            </div>
            {errors.password?.message ? (
              <p className="text-sm text-(--admin-danger)" id="password-error">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {visibleError ? (
            <p
              aria-live="assertive"
              className="rounded-md border border-(--admin-danger) bg-(--admin-danger-soft) px-3 py-2 text-sm text-(--admin-text-strong)"
              role="alert"
            >
              {visibleError}
            </p>
          ) : null}

          <div className="pt-2">
            <Button
              aria-busy={isLoading}
              className="w-full"
              disabled={isLoading || !isValid}
              size="lg"
              type="submit"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : null}
              {isLoading ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
