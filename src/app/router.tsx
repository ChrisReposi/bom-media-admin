import { createBrowserRouter } from "react-router-dom";

import { MainLayout } from "@/layouts/MainLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { VideoDetailPage } from "@/pages/VideoDetailPage";
import { VideosPage } from "@/pages/VideosPage";
import { WebsitesPage } from "@/pages/WebsitesPage";
import LoginPage from "@/pages/LoginPage";

import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicOnlyRoute } from "./routes/PublicOnlyRoute";

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "/",
            element: <DashboardPage />,
          },
          {
            path: "/videos",
            element: <VideosPage />,
          },
          {
            path: "/videos/:videoId",
            element: <VideoDetailPage />,
          },
          {
            path: "/websites",
            element: <WebsitesPage />,
          },
          {
            path: "/settings",
            element: <SettingsPage />,
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
