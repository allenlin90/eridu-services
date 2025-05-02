import { PrivateRouteGuard } from "@/auth/components/private-route-guard";
import { PublicRouteGuard } from "@/auth/components/public-route-guard";
import { Layout } from "@/components/layout";
import { ErrorBoundary } from "react-error-boundary";
import { Navigate, Route, Routes } from "react-router";

import ErrorFallback from "./components/error-fallback";
import Dashboard from "./pages/dashboard";
import ErifyAdminBrands from "./pages/erify/admin/brands";
import ErifyAdminPlatforms from "./pages/erify/admin/platforms";
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
              <Route path="admin">
                <Route path="brands" element={<ErifyAdminBrands />} />
                <Route path="platforms" element={<ErifyAdminPlatforms />} />
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
