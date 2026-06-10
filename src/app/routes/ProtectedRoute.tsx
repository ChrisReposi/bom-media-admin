import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAppSelector } from "@/store/hooks";

export function ProtectedRoute() {
  const location = useLocation();
  const auth = useAppSelector((state) => state.auth);
  const isLoggedIn =
    auth.isAuthenticated && Boolean(auth.admin) && Boolean(auth.accessToken);

  if (auth.status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--admin-app-bg) px-6 text-sm text-(--admin-text)">
        Dang kiem tra phien dang nhap...
      </main>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
