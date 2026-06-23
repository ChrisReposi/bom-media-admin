import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  bootstrapAdminSessionThunk,
  clearCredentials,
  setAuthChecking,
} from "@/features/auth/authSlice";
import type { NormalizedApiError } from "@/lib/api/apiError";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type AuthSessionBootstrapProps = {
  children: ReactNode;
};

const fallbackBootstrapError: NormalizedApiError = {
  status: null,
  message: "Khong the khoi phuc phien dang nhap. Vui long thu lai.",
  isCanceled: false,
  isAuthError: false,
  isNetworkError: false,
  isRateLimitError: false,
  isServerError: false,
};

export function AuthSessionBootstrap({ children }: AuthSessionBootstrapProps) {
  const dispatch = useAppDispatch();
  const refreshToken = useAppSelector((state) => state.auth.refreshToken);
  const startedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [bootstrapError, setBootstrapError] =
    useState<NormalizedApiError | null>(null);

  const runBootstrap = useCallback(async () => {
    setBootstrapError(null);

    if (!refreshToken) {
      dispatch(clearCredentials());
      setIsReady(true);
      return;
    }

    dispatch(setAuthChecking());

    const result = await dispatch(bootstrapAdminSessionThunk({ refreshToken }));

    if (bootstrapAdminSessionThunk.fulfilled.match(result)) {
      setIsReady(true);
      return;
    }

    const normalizedError = result.payload ?? fallbackBootstrapError;

    if (normalizedError.isAuthError) {
      setIsReady(true);
      return;
    }

    setBootstrapError(normalizedError);
    setIsReady(false);
  }, [dispatch, refreshToken]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    void runBootstrap();
  }, [runBootstrap]);

  if (bootstrapError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--admin-app-bg) px-6 text-(--admin-text-strong)">
        <section className="w-full max-w-md rounded-lg border border-(--admin-border) bg-(--admin-surface) p-6 shadow-(--admin-shadow)">
          <p className="text-sm font-semibold uppercase tracking-wide text-(--admin-text-muted)">
            Session recovery
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Khong the ket noi API</h1>
          <p className="mt-3 text-sm leading-6 text-(--admin-text)">
            {bootstrapError.message}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="inline-flex h-10 items-center rounded-lg bg-(--admin-primary) px-4 text-sm font-medium text-white hover:bg-(--admin-primary-strong)"
              type="button"
              onClick={() => void runBootstrap()}
            >
              Thu lai
            </button>
            <button
              className="inline-flex h-10 items-center rounded-lg border border-(--admin-border) bg-(--admin-surface-alt) px-4 text-sm font-medium text-(--admin-text) hover:bg-(--admin-danger-soft) hover:text-(--admin-danger)"
              type="button"
              onClick={() => {
                dispatch(clearCredentials());
                setBootstrapError(null);
                setIsReady(true);
              }}
            >
              Dang nhap lai
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--admin-app-bg) px-6 text-(--admin-text)">
        <div className="rounded-lg border border-(--admin-border) bg-(--admin-surface) px-5 py-4 text-sm shadow-(--admin-shadow)">
          Dang khoi phuc phien dang nhap...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
