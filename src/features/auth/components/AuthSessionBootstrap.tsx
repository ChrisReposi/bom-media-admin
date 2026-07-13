import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { AppStatePanel } from "@/components/common/AppStatePanel";
import { Button } from "@/components/ui/button";
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
      <AppStatePanel
        description="Kiểm tra kết nối mạng và thử lại."
        fullScreen
        title="Không thể kết nối tới máy chủ."
        variant="error"
      >
        <Button type="button" onClick={() => void runBootstrap()}>
          Thử lại
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            dispatch(clearCredentials());
            setBootstrapError(null);
            setIsReady(true);
          }}
        >
          Đăng nhập lại
        </Button>
      </AppStatePanel>
    );
  }

  if (!isReady) {
    return (
      <AppStatePanel
        description="Vui lòng chờ trong giây lát."
        fullScreen
        title="Đang khôi phục phiên làm việc…"
      />
    );
  }

  return <>{children}</>;
}
