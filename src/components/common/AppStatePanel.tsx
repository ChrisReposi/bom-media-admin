import { Loader2, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

type AppStatePanelProps = {
  title: string;
  description?: string;
  variant?: "loading" | "error";
  fullScreen?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
};

/**
 * Presentation-only panel for app-level async/status states such as route
 * checking, session bootstrap, route lazy-loading and recovery errors.
 * It intentionally contains no auth/business logic and triggers no requests.
 */
export function AppStatePanel({
  title,
  description,
  variant = "loading",
  fullScreen = false,
  icon,
  children,
}: AppStatePanelProps) {
  const isError = variant === "error";
  const Wrapper = fullScreen ? "main" : "div";
  const wrapperClass = fullScreen
    ? "flex min-h-dvh items-center justify-center bg-(--admin-app-bg) px-6 py-10"
    : "flex min-h-[60vh] items-center justify-center px-6 py-10";

  return (
    <Wrapper className={wrapperClass}>
      <section
        aria-live={isError ? "assertive" : "polite"}
        className="w-full max-w-md rounded-xl border border-(--admin-border) bg-(--admin-surface) p-6 text-center shadow-(--admin-shadow)"
        role={isError ? "alert" : "status"}
      >
        <div
          className={[
            "mx-auto mb-4 flex size-12 items-center justify-center rounded-full",
            isError
              ? "bg-(--admin-warning-soft) text-(--admin-warning)"
              : "bg-(--admin-primary-soft) text-(--admin-primary)",
          ].join(" ")}
        >
          {icon ??
            (isError ? (
              <WifiOff className="size-5" />
            ) : (
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
            ))}
        </div>

        <h1 className="text-lg font-semibold text-(--admin-text-strong)">
          {title}
        </h1>

        {description ? (
          <p className="mt-2 text-sm leading-6 text-(--admin-text)">
            {description}
          </p>
        ) : null}

        {children ? (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            {children}
          </div>
        ) : null}
      </section>
    </Wrapper>
  );
}
