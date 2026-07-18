import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";

import { RouteLoadingFallback } from "@/components/common/RouteLoadingFallback";
import { MainLayout } from "@/layouts/MainLayout";
import { NotFoundPage } from "@/pages/NotFoundPage";

import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicOnlyRoute } from "./routes/PublicOnlyRoute";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const VideosPage = lazy(() =>
  import("@/pages/VideosPage").then((module) => ({
    default: module.VideosPage,
  })),
);
const VideoDetailPage = lazy(() =>
  import("@/pages/VideoDetailPage").then((module) => ({
    default: module.VideoDetailPage,
  })),
);
const WebsitesPage = lazy(() =>
  import("@/pages/WebsitesPage").then((module) => ({
    default: module.WebsitesPage,
  })),
);
const DomainsPage = lazy(() =>
  import("@/pages/DomainsPage").then((module) => ({
    default: module.DomainsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const ChangePasswordRequiredPage = lazy(() =>
  import("@/pages/ChangePasswordRequiredPage").then((module) => ({
    default: module.ChangePasswordRequiredPage,
  })),
);

function withRouteFallback(element: ReactNode) {
  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: "/login",
        element: withRouteFallback(<LoginPage />),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/change-password-required",
        element: withRouteFallback(<ChangePasswordRequiredPage />),
      },
      {
        element: <MainLayout />,
        children: [
          {
            path: "/",
            element: withRouteFallback(<DashboardPage />),
          },
          {
            path: "/videos",
            element: withRouteFallback(<VideosPage />),
          },
          {
            path: "/videos/:videoId",
            element: withRouteFallback(<VideoDetailPage />),
          },
          {
            path: "/websites",
            element: withRouteFallback(<WebsitesPage />),
          },
          {
            path: "/domains",
            element: withRouteFallback(<DomainsPage />),
          },
          {
            path: "/settings",
            element: withRouteFallback(<SettingsPage />),
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
