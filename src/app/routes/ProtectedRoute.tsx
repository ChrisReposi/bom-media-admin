import { Navigate, Outlet, useLocation } from "react-router-dom";

import { AppStatePanel } from "@/components/common/AppStatePanel";
import { useAppSelector } from "@/store/hooks";

export function ProtectedRoute() {
  const location = useLocation();
  const auth = useAppSelector((state) => state.auth);
  const isLoggedIn =
    auth.isAuthenticated && Boolean(auth.admin) && Boolean(auth.accessToken);

  if (auth.status === "checking") {
    return (
      <AppStatePanel
        description="Vui lòng chờ trong giây lát."
        fullScreen
        title="Đang kiểm tra phiên đăng nhập…"
      />
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
