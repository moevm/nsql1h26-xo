import { createElement } from 'react';
import type { ComponentType } from 'react';
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { RequireRole } from "./components/RequireRole";
import type { UserRole } from "./api/client";
import { Login } from "./screens/Login";
import { Register } from "./screens/Register";
import { ForgotPassword } from "./screens/ForgotPassword";
import { Overview } from "./screens/Overview";
import { Bots } from "./screens/Bots";
import { BotDetail } from "./screens/BotDetail";
import { EditBot } from "./screens/EditBot";
import { UploadBot } from "./screens/UploadBot";
import { Matches } from "./screens/Matches";
import { CreateMatch } from "./screens/CreateMatch";
import { MatchDetail } from "./screens/MatchDetail";
import { EditMatch } from "./screens/EditMatch";
import { Logs } from "./screens/Logs";
import { LogViewer } from "./screens/LogViewer";
import { EditLog } from "./screens/EditLog";
import { Statistics } from "./screens/Statistics";
import { ReportBuilder } from "./screens/ReportBuilder";
import { ImportExport } from "./screens/ImportExport";
import { GlobalSearch } from "./screens/GlobalSearch";
import { Settings } from "./screens/Settings";

function withRoles(Component: ComponentType, allowedRoles: UserRole[]) {
  return function RoleProtectedRoute() {
    return createElement(
      RequireRole,
      { allowedRoles },
      createElement(Component),
    );
  };
}

const ModeratorRoute = (Component: ComponentType) => withRoles(Component, ['moderator', 'admin']);
const AdminRoute = (Component: ComponentType) => withRoles(Component, ['moderator', 'admin']);

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/forgot-password",
    Component: ForgotPassword,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Overview },
      { path: "bots", Component: Bots },
      { path: "bots/upload", Component: ModeratorRoute(UploadBot) },
      { path: "bots/:id", Component: BotDetail },
      { path: "bots/:id/edit", Component: ModeratorRoute(EditBot) },
      { path: "matches", Component: Matches },
      { path: "matches/create", Component: CreateMatch },
      { path: "matches/:id", Component: MatchDetail },
      { path: "matches/:id/edit", Component: ModeratorRoute(EditMatch) },
      { path: "logs", Component: ModeratorRoute(Logs) },
      { path: "logs/:id", Component: LogViewer },
      { path: "logs/:id/edit", Component: ModeratorRoute(EditLog) },
      { path: "statistics", Component: Statistics },
      { path: "statistics/custom", Component: ReportBuilder },
      { path: "statistics/report-builder", Component: ReportBuilder },
      { path: "analytics", Component: ReportBuilder },
      { path: "import-export", Component: ModeratorRoute(ImportExport) },
      { path: "search", Component: GlobalSearch },
      { path: "settings", Component: AdminRoute(Settings) },
    ],
  },
]);
