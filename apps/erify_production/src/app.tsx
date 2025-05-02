import { ErifyAdmindGuard } from "@/admin/components/admin-guard";
import { PrivateRouteGuard } from "@/auth/components/private-route-guard";
import { PublicRouteGuard } from "@/auth/components/public-route-guard";
import ErrorFallback from "@/components/error-fallback";
import { Layout } from "@/components/layout";
import { ErrorBoundary } from "react-error-boundary";
import { Navigate, Route, Routes } from "react-router";

import Dashboard from "./pages/dashboard";
import ErifyAdminBrands from "./pages/erify/admin/brands";
import AdminDashboard from "./pages/erify/admin/dashboard";
import ErifyAdminMaterials from "./pages/erify/admin/materials";
import ErifyAdminPlatforms from "./pages/erify/admin/platforms";
import ErifyAdminShows from "./pages/erify/admin/shows";
import ErifyAdminStudios from "./pages/erify/admin/studios";
import ErifyAdminTeams from "./pages/erify/admin/teams";
import ErifyAdminUsers from "./pages/erify/admin/users";
import LivestreamDashboard from "./pages/livestream/dashboard";
import ShowPage from "./pages/livestream/show";
import ShowsPage from "./pages/livestream/shows";
import LoginPage from "./pages/login";

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="login" element={<PublicRouteGuard />}>
            <Route index element={<LoginPage />} />
          </Route>
          <Route path="/" element={<PrivateRouteGuard />}>
            <Route index element={<Dashboard />} />
            <Route path="livestream">
              <Route index element={<LivestreamDashboard />} />
              <Route index element={<Navigate to="shows" />} />
              <Route path="shows" element={<ShowsPage />} />
              <Route path="shows/:show_uid" element={<ShowPage />} />
            </Route>
            <Route path="erify">
              <Route index element={<Navigate to="admin" />} />
              <Route path="admin" element={<ErifyAdmindGuard />}>
                <Route index element={<AdminDashboard />} />
                <Route path="brands" element={<ErifyAdminBrands />} />
                <Route path="materials" element={<ErifyAdminMaterials />} />
                <Route path="platforms" element={<ErifyAdminPlatforms />} />
                <Route path="shows" element={<ErifyAdminShows />} />
                <Route path="studios" element={<ErifyAdminStudios />} />
                <Route path="teams" element={<ErifyAdminTeams />} />
                <Route path="users" element={<ErifyAdminUsers />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
