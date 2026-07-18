import { Laptop, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { normalizeApiError } from "@/lib/api/apiError";
import { persistor } from "@/store";
import { useAppDispatch } from "@/store/hooks";

import { listOwnAdminSessions, revokeOwnAdminSession } from "../authApi";
import { publishAuthEvent } from "../authCrossTab";
import { clearCredentials } from "../authSlice";
import type { AdminOwnSession } from "../authTypes";

export function OwnSessionsPanel() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminOwnSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      setItems((await listOwnAdminSessions(signal)).items);
    } catch (caught) {
      const normalized = normalizeApiError(caught);
      if (!normalized.isCanceled) setError(normalized.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function revoke(session: AdminOwnSession) {
    if (revokingId) return;
    setRevokingId(session.id);
    try {
      const response = await revokeOwnAdminSession(session.id);
      if (response.currentSessionRevoked) {
        dispatch(clearCredentials());
        publishAuthEvent({ type: "AUTH_CLEARED" });
        await persistor.flush();
        navigate("/login", { replace: true });
        return;
      }
      setItems((current) => current.filter((item) => item.id !== session.id));
      toast.success("Đã thu hồi phiên.");
    } catch (caught) {
      setError(normalizeApiError(caught).message);
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-(--admin-text-strong)">
            Phiên đang hoạt động
          </h2>
          <p className="mt-1 text-sm text-(--admin-text-muted)">
            Chỉ hiển thị phiên thuộc tài khoản hiện tại.
          </p>
        </div>
        <Button
          disabled={loading}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void load()}
        >
          <RefreshCw className="size-4" /> Làm mới
        </Button>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-(--admin-danger)" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-(--admin-text-muted)">Đang tải phiên...</p>
        ) : null}
        {!loading && items.length === 0 ? (
          <p className="text-sm text-(--admin-text-muted)">
            Không có phiên hoạt động.
          </p>
        ) : null}
        {items.map((session) => (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-(--admin-border) p-3"
            key={session.id}
          >
            <div className="flex min-w-0 gap-3">
              <Laptop className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-(--admin-text-strong)">
                  {session.isCurrent ? "Phiên hiện tại" : "Phiên khác"}
                </p>
                <p className="text-xs text-(--admin-text-muted)">
                  Hoạt động:{" "}
                  {formatDate(session.lastUsedAt ?? session.createdAt)} · Hết
                  hạn: {formatDate(session.expiresAt)}
                </p>
              </div>
            </div>
            <Button
              disabled={revokingId !== null}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void revoke(session)}
            >
              {revokingId === session.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              Thu hồi
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
