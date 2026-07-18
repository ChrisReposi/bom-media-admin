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

  const redirect = getProtectedRouteRedirect({
    isLoggedIn,
    mustChangePassword: auth.admin?.mustChangePassword ?? false,
    pathname: location.pathname,
  });

  if (redirect === "/login") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (redirect === "/change-password-required") {
    return <Navigate to="/change-password-required" replace />;
  }

  if (redirect === "/") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function getProtectedRouteRedirect(params: {
  isLoggedIn: boolean;
  mustChangePassword: boolean;
  pathname: string;
}): "/login" | "/change-password-required" | "/" | null {
  if (!params.isLoggedIn) return "/login";
  if (
    params.mustChangePassword &&
    params.pathname !== "/change-password-required"
  ) {
    return "/change-password-required";
  }
  if (
    !params.mustChangePassword &&
    params.pathname === "/change-password-required"
  ) {
    return "/";
  }
  return null;
}
