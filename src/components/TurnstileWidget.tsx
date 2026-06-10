import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (errorCode?: string) => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: string) => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
};

export type TurnstileWidgetRef = {
  reset: () => void;
};

const SCRIPT_ID = "cf-turnstile-script";

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existing) {
      if (window.turnstile) {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Turnstile")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  function TurnstileWidget(
    { siteKey, onVerify, onExpire, onError, theme = "light", size = "normal" },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const renderTimerRef = useRef<number | null>(null);

    const onVerifyRef = useRef(onVerify);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);

    useEffect(() => {
      onVerifyRef.current = onVerify;
    }, [onVerify]);

    useEffect(() => {
      onExpireRef.current = onExpire;
    }, [onExpire]);

    useEffect(() => {
      onErrorRef.current = onError;
    }, [onError]);

    useImperativeHandle(ref, () => ({
      reset() {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }));

    useEffect(() => {
      let cancelled = false;

      loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;
          if (widgetIdRef.current) return;

          // Delay 1 tick to survive StrictMode's first fake mount in dev
          renderTimerRef.current = window.setTimeout(() => {
            if (cancelled || !containerRef.current || !window.turnstile) return;
            if (widgetIdRef.current) return;

            containerRef.current.innerHTML = "";

            widgetIdRef.current = window.turnstile.render(
              containerRef.current,
              {
                sitekey: siteKey,
                theme,
                size,
                callback: (token) => onVerifyRef.current(token),
                "error-callback": (errorCode) =>
                  onErrorRef.current?.(errorCode),
                "expired-callback": () => onExpireRef.current?.(),
                "timeout-callback": () => onExpireRef.current?.(),
              },
            );
          }, 0);
        })
        .catch((err) => {
          onErrorRef.current?.(
            err instanceof Error ? err.message : "Turnstile load failed",
          );
        });

      return () => {
        cancelled = true;

        if (renderTimerRef.current !== null) {
          window.clearTimeout(renderTimerRef.current);
          renderTimerRef.current = null;
        }

        if (widgetIdRef.current && window.turnstile?.remove) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, theme, size]);

    return <div ref={containerRef} />;
  },
);

export default TurnstileWidget;
