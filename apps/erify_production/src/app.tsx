import { PrivateRouteGuard } from "@/auth/components/private-route-guard";
import { PublicRouteGuard } from "@/auth/components/public-route-guard";
import { Layout } from "@/components/layout";
import { ErrorBoundary } from "react-error-boundary";
import { Navigate, Route, Routes } from "react-router";

import ErrorFallback from "./components/error-fallback";
import Dashboard from "./pages/dashboard";
import ErifyAdminBrands from "./pages/erify/admin/brands";
import { ErifyAdmindGuard } from "./pages/erify/admin/components/admin-guard";
import ErifyAdminMaterials from "./pages/erify/admin/materials";
import ErifyAdminPlatforms from "./pages/erify/admin/platforms";
import ErifyAdminShows from "./pages/erify/admin/shows";
import ErifyAdminStudios from "./pages/erify/admin/studios";
import ErifyAdminTeams from "./pages/erify/admin/teams";
import ErifyAdminUsers from "./pages/erify/admin/users";
import LoginPage from "./pages/login";
import ShowPage from "./pages/show";
import ShowsPage from "./pages/shows";

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
            <Route path="shows" element={<ShowsPage />} />
            <Route path="shows/:show_uid" element={<ShowPage />} />
            <Route path="erify">
              <Route index element={<Navigate to="admin" />} />
              <Route path="admin" element={<ErifyAdmindGuard />}>
                <Route index element={<Navigate to="brands" />} />
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
