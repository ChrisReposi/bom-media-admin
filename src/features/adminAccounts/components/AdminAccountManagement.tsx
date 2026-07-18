import {
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Dialog } from "radix-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentAdmin } from "@/features/auth/authApi";
import { updateAdminProfile } from "@/features/auth/authSlice";
import { normalizeApiError } from "@/lib/api/apiError";
import { useAppDispatch } from "@/store/hooks";

import {
  changeAdminAccountRole,
  changeAdminAccountStatus,
  createAdminAccount,
  deleteAdminAccount,
  listAdminAccounts,
  resetAdminAccountPassword,
  revokeAdminAccountSessions,
} from "../adminAccountsApi";
import {
  getAdminAccountErrorMessage,
  shouldRefreshCurrentAdmin,
} from "../adminAccountPolicy";
import type {
  AdminAccountListQuery,
  ManagedAdminAccount,
  ManagedAdminRole,
  TemporaryAdminPasswordResponse,
} from "../adminAccountTypes";

type AccountAction = "role" | "status" | "revoke" | "reset" | "delete";

const selectClass =
  "h-10 rounded-md border border-(--admin-border) bg-(--admin-input-bg) px-3 text-sm text-(--admin-text-strong)";

export function AdminAccountManagement() {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState<AdminAccountListQuery>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchDraft, setSearchDraft] = useState("");
  const [items, setItems] = useState<ManagedAdminAccount[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<{
    account: ManagedAdminAccount;
    action: AccountAction;
  } | null>(null);
  const [temporaryResult, setTemporaryResult] =
    useState<TemporaryAdminPasswordResponse | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const version = ++requestVersion.current;
      setLoading(true);
      setError(null);
      try {
        const result = await listAdminAccounts(query, signal);
        if (version !== requestVersion.current || signal?.aborted) return;
        setItems(result.items);
        setMeta(result.meta);
      } catch (caught) {
        const normalized = normalizeApiError(caught);
        if (!normalized.isCanceled && version === requestVersion.current) {
          setError(getAdminAccountErrorMessage(normalized));
        }
      } finally {
        if (version === requestVersion.current && !signal?.aborted)
          setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function handleMutationError(caught: unknown) {
    const normalized = normalizeApiError(caught);
    setError(getAdminAccountErrorMessage(normalized));
    if (shouldRefreshCurrentAdmin(normalized)) {
      setSelected(null);
      setCreateOpen(false);
      try {
        dispatch(updateAdminProfile((await getCurrentAdmin()).admin));
      } catch {
        // A 401 is handled centrally; keep the original permission error visible.
      }
    }
    if (normalized.code === "ADMIN_CONCURRENT_MUTATION") await load();
  }

  return (
    <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-(--admin-text-strong)">
            Quản lý tài khoản quản trị
          </h2>
          <p className="mt-1 text-sm text-(--admin-text-muted)">
            Chỉ OWNER được xem và thay đổi ADMIN/STAFF. Máy chủ vẫn là ranh giới
            phân quyền.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={loading}
            type="button"
            variant="outline"
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" /> Làm mới
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Tạo tài khoản
          </Button>
        </div>
      </div>

      <form
        className="mt-5 grid gap-3 md:grid-cols-[minmax(12rem,1fr)_10rem_10rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery((current) => ({
            ...current,
            page: 1,
            search: searchDraft.trim() || undefined,
          }));
        }}
      >
        <Input
          aria-label="Tìm tên đăng nhập"
          id="admin-accounts-search"
          maxLength={80}
          name="adminAccountsSearch"
          placeholder="Tìm tên đăng nhập"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
        <select
          aria-label="Lọc vai trò"
          className={selectClass}
          id="admin-accounts-role-filter"
          name="adminAccountsRoleFilter"
          value={query.role ?? ""}
          onChange={(event) =>
            setQuery((current) => ({
              ...current,
              page: 1,
              role: event.target.value as AdminAccountListQuery["role"],
            }))
          }
        >
          <option value="">Mọi vai trò</option>
          <option value="OWNER">OWNER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="STAFF">STAFF</option>
        </select>
        <select
          aria-label="Lọc trạng thái"
          className={selectClass}
          id="admin-accounts-status-filter"
          name="adminAccountsStatusFilter"
          value={query.status ?? ""}
          onChange={(event) =>
            setQuery((current) => ({
              ...current,
              page: 1,
              status: event.target.value as AdminAccountListQuery["status"],
            }))
          }
        >
          <option value="">Mọi trạng thái</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="DISABLED">DISABLED</option>
        </select>
        <Button type="submit" variant="outline">
          Tìm kiếm
        </Button>
        <label
          className="flex items-center gap-2 text-sm text-(--admin-text-muted) md:col-span-4"
          htmlFor="admin-accounts-include-deleted"
        >
          <input
            checked={query.includeDeleted ?? false}
            id="admin-accounts-include-deleted"
            name="adminAccountsIncludeDeleted"
            type="checkbox"
            onChange={(event) =>
              setQuery((current) => ({
                ...current,
                page: 1,
                includeDeleted: event.target.checked,
              }))
            }
          />
          Bao gồm tài khoản đã xóa logic
        </label>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-(--admin-danger)" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[54rem] text-left text-sm">
          <thead className="border-b border-(--admin-border) text-(--admin-text-muted)">
            <tr>
              <th className="p-3">Tài khoản</th>
              <th className="p-3">Vai trò</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Phiên</th>
              <th className="p-3">Cập nhật</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((account) => (
              <tr className="border-b border-(--admin-border)" key={account.id}>
                <td className="p-3 font-medium text-(--admin-text-strong)">
                  {account.username}
                  {account.mustChangePassword ? (
                    <span className="ml-2 text-xs text-(--admin-warning)">
                      Phải đổi mật khẩu
                    </span>
                  ) : null}
                  {account.deletedAt ? (
                    <span className="ml-2 text-xs text-(--admin-danger)">
                      Đã xóa
                    </span>
                  ) : null}
                </td>
                <td className="p-3">{account.role}</td>
                <td className="p-3">{account.status}</td>
                <td className="p-3">{account.activeSessionCount}</td>
                <td className="p-3">{formatDate(account.updatedAt)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap justify-end gap-1">
                    {!account.deletedAt && account.role !== "OWNER" ? (
                      <>
                        <ActionButton
                          label="Vai trò"
                          onClick={() =>
                            setSelected({ account, action: "role" })
                          }
                        />
                        <ActionButton
                          label={
                            account.status === "ACTIVE"
                              ? "Vô hiệu"
                              : "Kích hoạt"
                          }
                          onClick={() =>
                            setSelected({ account, action: "status" })
                          }
                        />
                        <ActionButton
                          label="Thu hồi phiên"
                          onClick={() =>
                            setSelected({ account, action: "revoke" })
                          }
                        />
                        <ActionButton
                          label="Reset mật khẩu"
                          onClick={() =>
                            setSelected({ account, action: "reset" })
                          }
                        />
                        {account.status === "DISABLED" ? (
                          <ActionButton
                            destructive
                            label="Xóa logic"
                            onClick={() =>
                              setSelected({ account, action: "delete" })
                            }
                          />
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs text-(--admin-text-muted)">
                        Được bảo vệ
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 ? (
          <p className="p-6 text-center text-sm text-(--admin-text-muted)">
            Không có tài khoản phù hợp.
          </p>
        ) : null}
        {loading ? (
          <p className="p-6 text-center text-sm text-(--admin-text-muted)">
            Đang tải...
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-(--admin-text-muted)">
          {meta.total} tài khoản
        </span>
        <div className="flex items-center gap-2">
          <Button
            disabled={meta.page <= 1 || loading}
            size="sm"
            variant="outline"
            onClick={() =>
              setQuery((current) => ({
                ...current,
                page: Math.max(1, (current.page ?? 1) - 1),
              }))
            }
          >
            Trước
          </Button>
          <span>
            {meta.page}/{Math.max(meta.totalPages, 1)}
          </span>
          <Button
            disabled={meta.page >= meta.totalPages || loading}
            size="sm"
            variant="outline"
            onClick={() =>
              setQuery((current) => ({
                ...current,
                page: (current.page ?? 1) + 1,
              }))
            }
          >
            Sau
          </Button>
        </div>
      </div>

      <CreateAccountDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(result) => {
          setCreateOpen(false);
          setTemporaryResult(result);
          void load();
        }}
        onError={handleMutationError}
      />
      <AccountActionDialog
        selected={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onSuccess={(result) => {
          setSelected(null);
          if (result) setTemporaryResult(result);
          void load();
        }}
        onError={handleMutationError}
      />
      <TemporaryPasswordDialog
        result={temporaryResult}
        onClose={() => setTemporaryResult(null)}
      />
    </section>
  );
}

function ActionButton({
  label,
  destructive = false,
  onClick,
}: {
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className={destructive ? "text-(--admin-danger)" : undefined}
      size="sm"
      type="button"
      variant="ghost"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function CreateAccountDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: TemporaryAdminPasswordResponse) => void;
  onError: (error: unknown) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<ManagedAdminRole>("STAFF");
  const [currentPassword, setCurrentPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await createAdminAccount({
        username,
        role,
        currentPassword,
      });
      setUsername("");
      setCurrentPassword("");
      props.onCreated(result);
    } catch (error) {
      await props.onError(error);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <BaseDialog
      open={props.open}
      title="Tạo tài khoản ADMIN/STAFF"
      description="Tài khoản mới sẽ nhận một mật khẩu tạm thời chỉ hiển thị một lần ngay sau khi tạo. Cần mật khẩu OWNER hiện tại để xác nhận."
      submitting={submitting}
      onOpenChange={(open) => {
        if (!open && !submitting) {
          setCurrentPassword("");
          props.onOpenChange(false);
        }
      }}
    >
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <LabeledInput
          autoComplete="off"
          id="create-account-username"
          label="Tên đăng nhập"
          maxLength={32}
          name="createAccountUsername"
          value={username}
          onChange={setUsername}
        />
        <div>
          <label
            className="block text-sm font-medium"
            htmlFor="create-account-role"
          >
            Vai trò
          </label>
          <select
            className={`${selectClass} mt-2 w-full`}
            id="create-account-role"
            name="createAccountRole"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as ManagedAdminRole)
            }
          >
            <option value="ADMIN">ADMIN</option>
            <option value="STAFF">STAFF</option>
          </select>
        </div>
        <LabeledInput
          autoComplete="current-password"
          id="create-account-owner-password"
          label="Mật khẩu OWNER hiện tại"
          maxLength={128}
          name="createAccountOwnerPassword"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <DialogButtons
          submitting={submitting}
          confirm="Tạo tài khoản"
          onCancel={() => props.onOpenChange(false)}
        />
      </form>
    </BaseDialog>
  );
}

function AccountActionDialog(props: {
  selected: { account: ManagedAdminAccount; action: AccountAction } | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: (temporary?: TemporaryAdminPasswordResponse) => void;
  onError: (error: unknown) => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmUsername, setConfirmUsername] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const selected = props.selected;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || submitting) return;
    setSubmitting(true);
    const { account, action } = selected;
    try {
      if (action === "role")
        await changeAdminAccountRole(account.id, {
          role: account.role === "ADMIN" ? "STAFF" : "ADMIN",
          currentPassword,
          expectedUpdatedAt: account.updatedAt,
        });
      if (action === "status")
        await changeAdminAccountStatus(account.id, {
          status: account.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
          currentPassword,
          expectedUpdatedAt: account.updatedAt,
        });
      if (action === "revoke")
        await revokeAdminAccountSessions(account.id, currentPassword);
      if (action === "reset") {
        const result = await resetAdminAccountPassword(account.id, {
          currentPassword,
          expectedUpdatedAt: account.updatedAt,
        });
        clear();
        props.onSuccess(result);
        return;
      }
      if (action === "delete")
        await deleteAdminAccount(account.id, {
          currentPassword,
          confirmUsername,
          expectedUpdatedAt: account.updatedAt,
        });
      clear();
      props.onSuccess();
    } catch (error) {
      await props.onError(error);
    } finally {
      setSubmitting(false);
    }
  }
  function clear() {
    setCurrentPassword("");
    setConfirmUsername("");
    setAcknowledged(false);
  }
  const deleteReady =
    selected?.action !== "delete" ||
    (confirmUsername === selected.account.username && acknowledged);
  return (
    <BaseDialog
      open={selected !== null}
      title={
        selected
          ? actionTitle(selected.action, selected.account)
          : "Thao tác tài khoản"
      }
      description={
        selected
          ? actionDescription(selected.action, selected.account)
          : "Xác nhận thao tác quản trị tài khoản."
      }
      submitting={submitting}
      onOpenChange={(open) => {
        if (!open && !submitting) {
          clear();
          props.onOpenChange(false);
        }
      }}
    >
      {selected ? (
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <p className="text-sm text-(--admin-text-muted)">
            Target:{" "}
            <strong className="text-(--admin-text-strong)">
              {selected.account.username}
            </strong>
            . Không có thay đổi optimistic; danh sách sẽ được tải lại từ máy
            chủ.
          </p>
          {selected.action === "delete" ? (
            <>
              <LabeledInput
                autoComplete="off"
                id="account-action-confirm-username"
                label={`Nhập chính xác “${selected.account.username}”`}
                name="accountActionConfirmUsername"
                value={confirmUsername}
                onChange={setConfirmUsername}
              />
              <label
                className="flex gap-2 text-sm"
                htmlFor="account-action-acknowledged"
              >
                <input
                  checked={acknowledged}
                  id="account-action-acknowledged"
                  name="accountActionAcknowledged"
                  type="checkbox"
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                Tôi hiểu đây là xóa logic, thu hồi toàn bộ phiên và không thể
                tái sử dụng username.
              </label>
            </>
          ) : null}
          <LabeledInput
            autoComplete="current-password"
            id="account-action-owner-password"
            label="Mật khẩu OWNER hiện tại"
            maxLength={128}
            name="accountActionOwnerPassword"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <DialogButtons
            destructive={selected.action === "delete"}
            disabled={!deleteReady || !currentPassword}
            submitting={submitting}
            confirm={actionConfirm(selected.action)}
            onCancel={() => props.onOpenChange(false)}
          />
        </form>
      ) : null}
    </BaseDialog>
  );
}

function TemporaryPasswordDialog({
  result,
  onClose,
}: {
  result: TemporaryAdminPasswordResponse | null;
  onClose: () => void;
}) {
  return (
    <BaseDialog
      open={result !== null}
      title="Mật khẩu tạm thời — chỉ hiển thị một lần"
      description="Sao chép và chuyển mật khẩu này qua kênh an toàn trước khi đóng. Giá trị không thể xem lại sau khi hộp thoại đóng."
      submitting={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {result ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-(--admin-warning) bg-(--admin-warning-soft) p-3 text-sm">
            <ShieldAlert className="mb-2 size-5" />
            Hãy chuyển mật khẩu qua kênh an toàn. Đóng hộp thoại sẽ xóa giá trị
            khỏi state giao diện.
          </div>
          <div>
            <p className="text-sm font-medium">{result.account.username}</p>
            <code className="mt-2 block break-all rounded bg-(--admin-input-bg) p-3">
              {result.temporaryPassword}
            </code>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void navigator.clipboard.writeText(result.temporaryPassword)
              }
            >
              <Copy className="size-4" /> Sao chép
            </Button>
            <Button type="button" onClick={onClose}>
              Đã lưu an toàn, đóng
            </Button>
          </div>
        </div>
      ) : null}
    </BaseDialog>
  );
}

function BaseDialog({
  open,
  title,
  description,
  submitting,
  onOpenChange,
  children,
}: {
  open: boolean;
  title: string;
  /**
   * Accessible description announced by screen readers after the title.
   * Required: every account dialog carries an OWNER-only consequence that the
   * title alone does not convey. Rendered via `Dialog.Description` so Radix
   * wires `aria-describedby` on the content itself.
   */
  description: React.ReactNode;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-(--admin-overlay)" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-(--admin-border) bg-(--admin-surface) p-5 shadow-(--admin-shadow)"
          onInteractOutside={(event) => {
            if (submitting) event.preventDefault();
          }}
        >
          <Dialog.Title className="text-lg font-semibold text-(--admin-text-strong)">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mb-4 mt-1 text-sm leading-6 text-(--admin-text-muted)">
            {description}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogButtons({
  submitting,
  confirm,
  destructive = false,
  disabled = false,
  onCancel,
}: {
  submitting: boolean;
  confirm: string;
  destructive?: boolean;
  disabled?: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-(--admin-border) pt-4">
      <Button
        disabled={submitting}
        type="button"
        variant="outline"
        onClick={onCancel}
      >
        Hủy
      </Button>
      <Button
        disabled={submitting || disabled}
        type="submit"
        variant={destructive ? "destructive" : "default"}
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : destructive ? (
          <Trash2 className="size-4" />
        ) : null}
        {confirm}
      </Button>
    </div>
  );
}

function LabeledInput({
  id,
  name,
  label,
  value,
  type = "text",
  maxLength,
  autoComplete,
  onChange,
}: {
  /** Owned by the call site so each field keeps a stable, unique identity. */
  id: string;
  name: string;
  label: string;
  value: string;
  type?: string;
  maxLength?: number;
  autoComplete?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        className="block text-sm font-medium text-(--admin-text-strong)"
        htmlFor={id}
      >
        {label}
      </label>
      <Input
        required
        autoComplete={autoComplete}
        className="mt-2"
        id={id}
        maxLength={maxLength}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function actionTitle(
  action: AccountAction,
  account: ManagedAdminAccount,
): string {
  if (action === "role")
    return `Đổi vai trò thành ${account.role === "ADMIN" ? "STAFF" : "ADMIN"}`;
  if (action === "status")
    return account.status === "ACTIVE"
      ? "Vô hiệu hóa tài khoản"
      : "Kích hoạt tài khoản";
  if (action === "revoke") return "Thu hồi toàn bộ phiên";
  if (action === "reset") return "Đặt lại mật khẩu";
  return "Xóa logic tài khoản";
}

function actionDescription(
  action: AccountAction,
  account: ManagedAdminAccount,
): string {
  if (action === "role")
    return `Vai trò của ${account.username} sẽ đổi từ ${account.role} thành ${
      account.role === "ADMIN" ? "STAFF" : "ADMIN"
    }, thay đổi quyền truy cập ngay lập tức. Cần mật khẩu OWNER hiện tại.`;
  if (action === "status")
    return account.status === "ACTIVE"
      ? `${account.username} sẽ bị vô hiệu hóa và không thể đăng nhập cho tới khi được kích hoạt lại. Cần mật khẩu OWNER hiện tại.`
      : `${account.username} sẽ được kích hoạt lại và có thể đăng nhập trở lại. Cần mật khẩu OWNER hiện tại.`;
  if (action === "revoke")
    return `Toàn bộ phiên đăng nhập của ${account.username} sẽ bị thu hồi và tài khoản phải đăng nhập lại trên mọi thiết bị. Cần mật khẩu OWNER hiện tại.`;
  if (action === "reset")
    return `Mật khẩu của ${account.username} sẽ được thay bằng một mật khẩu tạm thời chỉ hiển thị một lần. Cần mật khẩu OWNER hiện tại.`;
  return `Xóa logic ${account.username}: thu hồi toàn bộ phiên và username không thể tái sử dụng. Hành động không thể hoàn tác từ giao diện quản trị. Cần mật khẩu OWNER hiện tại.`;
}

function actionConfirm(action: AccountAction): string {
  return {
    role: "Đổi vai trò",
    status: "Cập nhật trạng thái",
    revoke: "Thu hồi phiên",
    reset: "Reset mật khẩu",
    delete: "Xóa logic",
  }[action];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
