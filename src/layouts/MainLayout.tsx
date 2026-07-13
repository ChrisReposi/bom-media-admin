import {
  Globe2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Network,
  Settings,
  Video,
  X,
} from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { clearCredentials, logoutAdminThunk } from "@/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { persistor } from "@/store";

const navItems = [
  { label: "Tổng quan", path: "/", icon: LayoutDashboard },
  { label: "Video", path: "/videos", icon: Video },
  { label: "Website", path: "/websites", icon: Globe2 },
  { label: "Tên miền", path: "/domains", icon: Network },
  { label: "Cài đặt", path: "/settings", icon: Settings },
] as const;

type SidebarNavProps = {
  onNavigate?: () => void;
};

function SidebarNav({ onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label="Điều hướng chính" className="flex flex-1 flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            className={({ isActive }) =>
              [
                "group relative flex h-10 items-center gap-2 rounded-lg pr-3 text-sm transition-colors",
                isActive
                  ? "bg-(--admin-primary-soft) font-semibold text-(--admin-text-strong)"
                  : "font-medium text-(--admin-text) hover:bg-(--admin-sidebar-hover) hover:text-(--admin-text-strong)",
              ].join(" ")
            }
            end={item.path === "/"}
            to={item.path}
            onClick={onNavigate}
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={[
                    "h-5 w-1 shrink-0 rounded-full",
                    isActive ? "bg-(--admin-primary)" : "bg-transparent",
                  ].join(" ")}
                />
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

type LogoutButtonProps = {
  isLoggingOut: boolean;
  onLogout: () => void;
};

function LogoutButton({ isLoggingOut, onLogout }: LogoutButtonProps) {
  return (
    <button
      className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-(--admin-text) transition-colors hover:bg-(--admin-danger-soft) hover:text-(--admin-danger) disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isLoggingOut}
      type="button"
      onClick={onLogout}
    >
      {isLoggingOut ? (
        <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
      ) : (
        <LogOut className="size-4 shrink-0" />
      )}
      <span>{isLoggingOut ? "Đang đăng xuất…" : "Đăng xuất"}</span>
    </button>
  );
}

function BrandMark() {
  return (
    <div className="px-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-(--admin-text-muted)">
        BOM Media
      </p>
      <p className="mt-1 text-lg font-semibold text-(--admin-text-strong)">
        Video Share CMS
      </p>
    </div>
  );
}

export function MainLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const admin = useAppSelector((state) => state.auth.admin);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  async function handleLogout(): Promise<void> {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const result = await dispatch(logoutAdminThunk()).unwrap();
      await persistor.flush();

      navigate("/login", { replace: true });

      if (result.revokeConfirmed) {
        toast.success(result.message || "Đã đăng xuất.");
        return;
      }

      toast.warning(result.message);
    } catch {
      dispatch(clearCredentials());
      await persistor.flush();
      navigate("/login", { replace: true });
      toast.warning("Đã đăng xuất khỏi trình duyệt này.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  const currentNav = navItems.find((item) =>
    item.path === "/"
      ? location.pathname === "/"
      : location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`),
  );
  const currentSectionLabel = currentNav?.label ?? "Quản trị";

  return (
    <Dialog.Root open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
      <div className="h-dvh overflow-hidden bg-(--admin-app-bg) text-(--admin-text-strong)">
        <div className="flex h-full min-h-0">
          <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-(--admin-border) bg-(--admin-sidebar) px-4 py-5 md:flex">
            <div className="mb-8">
              <BrandMark />
            </div>

            <SidebarNav />

            <div className="mt-5 border-t border-(--admin-border) pt-4">
              <LogoutButton
                isLoggingOut={isLoggingOut}
                onLogout={() => void handleLogout()}
              />
            </div>
          </aside>

          <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <header className="shrink-0 border-b border-(--admin-border) bg-(--admin-header) px-4 py-3 backdrop-blur md:px-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Dialog.Trigger asChild>
                    <Button
                      aria-label="Mở menu điều hướng"
                      className="md:hidden"
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <Menu className="size-5" />
                    </Button>
                  </Dialog.Trigger>

                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-(--admin-text-muted)">
                      Bảng điều khiển quản trị
                    </p>
                    <p className="truncate text-base font-semibold text-(--admin-text-strong)">
                      {currentSectionLabel}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden max-w-40 truncate rounded-full border border-(--admin-border) bg-(--admin-header-pill) px-3 py-1.5 text-sm text-(--admin-text) sm:inline-block">
                    {admin?.username ?? "admin"}
                  </span>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-(--admin-overlay) data-[state=open]:animate-in data-[state=open]:fade-in motion-reduce:animate-none md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-(--admin-border) bg-(--admin-sidebar) p-4 shadow-(--admin-shadow) duration-(--admin-motion-normal) data-[state=open]:animate-in data-[state=open]:slide-in-from-left motion-reduce:animate-none md:hidden"
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-semibold text-(--admin-text-strong)">
              BOM Media
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                aria-label="Đóng menu điều hướng"
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          <SidebarNav onNavigate={() => setIsMobileNavOpen(false)} />

          <div className="mt-4 border-t border-(--admin-border) pt-4">
            <LogoutButton
              isLoggingOut={isLoggingOut}
              onLogout={() => void handleLogout()}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
