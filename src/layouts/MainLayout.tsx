import { Globe2, LayoutDashboard, LogOut, Settings, Video } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { clearCredentials } from "@/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Videos", path: "/videos", icon: Video },
  { label: "Websites", path: "/websites", icon: Globe2 },
  { label: "Settings", path: "/settings", icon: Settings },
] as const;

export function MainLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const admin = useAppSelector((state) => state.auth.admin);

  function handleLogout(): void {
    // TODO_MVP: Call backend logout endpoint in a later prompt.
    dispatch(clearCredentials());
    navigate("/login", { replace: true });
  }

  return (
    <div className="h-dvh overflow-hidden bg-(--admin-app-bg) text-(--admin-text-strong)">
      <div className="flex h-full min-h-0">
        <aside className="hidden h-full w-64 shrink-0 border-r border-(--admin-border) bg-(--admin-sidebar) px-4 py-5 md:flex md:flex-col">
          <div className="mb-8 px-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--admin-text-muted)">
              Video Share
            </p>
            <h1 className="mt-1 text-lg font-semibold text-(--admin-text-strong)">
              Admin CMS
            </h1>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    [
                      "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-(--admin-sidebar-active) text-white shadow-sm"
                        : "text-(--admin-text) hover:bg-(--admin-sidebar-hover) hover:text-(--admin-text-strong)",
                    ].join(" ")
                  }
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <button
            className="mt-5 flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-(--admin-text) transition-colors hover:bg-(--admin-danger-soft) hover:text-(--admin-danger)"
            type="button"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            <span>Logout</span>
          </button>
        </aside>

        <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="shrink-0 border-b border-(--admin-border) bg-(--admin-header) px-4 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-(--admin-text-muted)">
                  Admin workspace
                </p>
                <h2 className="mt-1 text-xl font-semibold text-(--admin-text-strong)">
                  Video Share CMS
                </h2>
              </div>

              <div className="flex items-center justify-between gap-3 md:justify-end">
                <div className="rounded-full border border-(--admin-border) bg-(--admin-header-pill) px-3 py-2 text-sm text-(--admin-text)">
                  {admin?.username ?? "admin"}
                </div>

                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-(--admin-border) bg-(--admin-surface) px-3 text-sm font-medium text-(--admin-text) transition-colors hover:bg-(--admin-danger-soft) hover:text-(--admin-danger) md:hidden"
                  type="button"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto md:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      [
                        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-(--admin-sidebar-active) text-white"
                          : "bg-(--admin-header-pill) text-(--admin-text) hover:bg-(--admin-header-pill-hover)",
                      ].join(" ")
                    }
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
