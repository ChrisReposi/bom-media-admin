import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAdminThunk } from "@/features/auth/authSlice";
import { toggleTheme } from "@/features/theme/themeSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod/v4";

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

const errorMotion: Variants = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 500, damping: 24 },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: 0.15 },
  },
};

function getFieldShellClass(hasError: boolean, isDark: boolean): string {
  if (hasError) {
    return [
      "group relative flex items-center rounded-xl border transition-all duration-200",
      isDark
        ? "border-red-500/70 bg-red-950/30 focus-within:ring-4 focus-within:ring-red-500/15"
        : "border-red-400 bg-red-50/70 focus-within:ring-4 focus-within:ring-red-100",
    ].join(" ");
  }

  return [
    "group relative flex items-center rounded-xl border transition-all duration-200",
    isDark
      ? "border-slate-700 bg-slate-950/70 hover:border-slate-600 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-400/15"
      : "border-blue-100 bg-white hover:border-blue-200 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100",
  ].join(" ");
}

function getFieldInputClass(isDark: boolean, extra?: string): string {
  return [
    "h-12 w-full rounded-xl border-0 bg-transparent px-4 py-0 shadow-none outline-none ring-0",
    "focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0",
    isDark
      ? "text-slate-50 placeholder:text-slate-500"
      : "text-slate-950 placeholder:text-slate-400",
    extra ?? "",
  ].join(" ");
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

  return (
    <main
      className={[
        "min-h-screen transition-colors duration-300",
        isDark
          ? "bg-[radial-gradient(circle_at_top_left,rgba(60,126,255,0.18),transparent_34%),linear-gradient(180deg,#0E1320_0%,#121826_45%,#161B24_100%)] text-slate-50"
          : "bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_34%),linear-gradient(180deg,#FBFDFF_0%,#F2F7FF_100%)] text-slate-950",
      ].join(" ")}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-8 px-6 py-8">
        <motion.section
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={[
            "w-full max-w-md rounded-[22px] border p-7 shadow-[0_30px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl md:p-8",
            isDark
              ? "border-white/10 bg-slate-950/55 shadow-[0_30px_70px_rgba(0,0,0,0.34)]"
              : "border-blue-100 bg-white/82",
          ].join(" ")}
        >
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p
                className={[
                  "text-sm font-medium uppercase tracking-wide",
                  isDark ? "text-slate-400" : "text-slate-500",
                ].join(" ")}
              >
                Video Share CMS
              </p>
              <h1 className="mt-2 text-3xl font-semibold">Đăng nhập</h1>
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className={[
                "flex size-11 items-center justify-center rounded-full border shadow-sm backdrop-blur transition-colors",
                isDark
                  ? "border-white/10 bg-white/6 text-slate-100 hover:border-blue-300/40 hover:bg-white/10"
                  : "border-zinc-200 bg-white/90 text-zinc-700 hover:border-blue-700 hover:text-blue-700",
              ].join(" ")}
              aria-label={
                isDark
                  ? "Chuyển sang giao diện sáng"
                  : "Chuyển sang giao diện tối"
              }
              onClick={() => dispatch(toggleTheme())}
            >
              {isDark ? (
                <Sun className="size-5" />
              ) : (
                <Moon className="size-5" />
              )}
            </motion.button>
          </div>

          <form className="space-y-4" noValidate onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <label
                className={[
                  "text-sm font-medium",
                  isDark ? "text-slate-200" : "text-slate-800",
                ].join(" ")}
                htmlFor="username"
              >
                Tài khoản
              </label>

              <div className={getFieldShellClass(!!errors.username, isDark)}>
                <Input
                  id="username"
                  placeholder="Nhập tài khoản"
                  autoComplete="username"
                  spellCheck={false}
                  autoCapitalize="none"
                  aria-invalid={!!errors.username}
                  aria-describedby={
                    errors.username ? "username-error" : undefined
                  }
                  className={getFieldInputClass(isDark)}
                  {...register("username")}
                />
              </div>

              <AnimatePresence mode="wait">
                {errors.username?.message ? (
                  <motion.p
                    {...errorMotion}
                    id="username-error"
                    className="text-sm text-red-500"
                  >
                    {errors.username.message}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className={[
                  "text-sm font-medium",
                  isDark ? "text-slate-200" : "text-slate-800",
                ].join(" ")}
                htmlFor="password"
              >
                Mật khẩu
              </label>

              <div className={getFieldShellClass(!!errors.password, isDark)}>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  className={getFieldInputClass(isDark, "pr-12")}
                  {...register("password")}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className={[
                    "absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 hover:scale-110",
                    isDark
                      ? "text-slate-400 hover:text-blue-300"
                      : "text-zinc-500 hover:text-blue-600",
                  ].join(" ")}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {errors.password?.message ? (
                  <motion.p
                    {...errorMotion}
                    id="password-error"
                    className="text-sm text-red-500"
                  >
                    {errors.password.message}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              {visibleError ? (
                <motion.p {...errorMotion} className="text-sm text-red-500">
                  {visibleError}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <motion.div
              whileHover={{
                scale: status === "loading" || !isValid ? 1 : 1.01,
              }}
              whileTap={{ scale: status === "loading" || !isValid ? 1 : 0.99 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="pt-4"
            >
              <Button
                className={[
                  "flex h-12 w-full items-center justify-center rounded-2xl text-base font-medium text-white",
                  "bg-blue-600 shadow-[0_18px_40px_rgba(37,99,235,0.28)] hover:bg-blue-700",
                  isDark ? "disabled:bg-blue-950" : "disabled:bg-blue-300",
                ].join(" ")}
                type="submit"
                disabled={status === "loading" || !isValid}
              >
                {status === "loading" ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </motion.div>
          </form>
        </motion.section>
      </div>
    </main>
  );
}
