import { AdminAccountManagement } from "@/features/adminAccounts/components/AdminAccountManagement";
import { can } from "@/features/auth/adminPermissions";
import { OwnPasswordForm } from "@/features/auth/components/OwnPasswordForm";
import { OwnSessionsPanel } from "@/features/auth/components/OwnSessionsPanel";
import { useAppSelector } from "@/store/hooks";

export function SettingsPage() {
  const admin = useAppSelector((state) => state.auth.admin);
  const canManageAccounts = can(admin?.role, "adminAccount.read");

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-(--admin-text-strong)">
          Cài đặt
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-(--admin-text-muted)">
          Quản lý mật khẩu, các phiên của chính bạn và—với OWNER—tài khoản
          ADMIN/STAFF.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <OwnPasswordForm />
        <div className="space-y-6">
          <section className="rounded-lg border border-(--admin-border) bg-(--admin-surface) p-5 shadow-sm">
            <h2 className="text-base font-semibold text-(--admin-text-strong)">
              Tài khoản hiện tại
            </h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-(--admin-text-muted)">Tài khoản</dt>
                <dd className="font-medium text-(--admin-text-strong)">
                  {admin?.username ?? "Không xác định"}
                </dd>
              </div>
              <div>
                <dt className="text-(--admin-text-muted)">Vai trò</dt>
                <dd className="font-medium text-(--admin-text-strong)">
                  {admin?.role ?? "Không xác định"}
                </dd>
              </div>
              <div>
                <dt className="text-(--admin-text-muted)">Trạng thái</dt>
                <dd className="font-medium text-(--admin-text-strong)">
                  {admin?.status ?? "Không xác định"}
                </dd>
              </div>
            </dl>
          </section>
          <OwnSessionsPanel />
        </div>
      </div>

      {canManageAccounts ? <AdminAccountManagement /> : null}
    </section>
  );
}
