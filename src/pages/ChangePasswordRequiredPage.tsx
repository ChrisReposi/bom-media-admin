import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OwnPasswordForm } from "@/features/auth/components/OwnPasswordForm";
import { publishAuthEvent } from "@/features/auth/authCrossTab";
import { clearCredentials, logoutAdminThunk } from "@/features/auth/authSlice";
import { getLogoutFailurePolicy } from "@/features/auth/logoutPolicy";
import { isNormalizedApiError, normalizeApiError } from "@/lib/api/apiError";
import { persistor } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { useState } from "react";

export function ChangePasswordRequiredPage() {
  const dispatch = useAppDispatch();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutFailure, setLogoutFailure] = useState<string | null>(null);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutFailure(null);
    try {
      await dispatch(logoutAdminThunk()).unwrap();
      await persistor.flush();
      window.location.assign("/login");
    } catch (caught) {
      const normalized = isNormalizedApiError(caught)
        ? caught
        : normalizeApiError(caught);
      setLogoutFailure(getLogoutFailurePolicy(normalized).message);
    } finally {
      setLoggingOut(false);
    }
  }

  async function clearLocalSession() {
    dispatch(clearCredentials());
    publishAuthEvent({ type: "AUTH_CLEARED" });
    await persistor.flush();
    window.location.assign("/login");
  }

  return (
    <main className="min-h-dvh bg-(--admin-bg) p-4 sm:p-8">
      <div className="mx-auto max-w-xl space-y-4 pt-[8vh]">
        <OwnPasswordForm forced />
        <div className="space-y-3">
          {logoutFailure ? (
            <div className="rounded-lg border border-(--admin-warning) bg-(--admin-warning-soft) p-3 text-sm">
              <p role="alert">{logoutFailure}</p>
              <Button
                className="mt-3"
                type="button"
                variant="outline"
                onClick={() => void clearLocalSession()}
              >
                Chỉ xóa phiên trên thiết bị này
              </Button>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button
              disabled={loggingOut}
              type="button"
              variant="outline"
              onClick={() => void logout()}
            >
              <LogOut className="size-4" />
              {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
