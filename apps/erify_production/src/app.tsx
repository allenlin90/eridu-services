import { ErifyAdmindGuard } from "@/admin/components/admin-guard";
import { PrivateRouteGuard } from "@/auth/components/private-route-guard";
import { PublicRouteGuard } from "@/auth/components/public-route-guard";
import { ErrorFallback } from "@/components/error-fallback";
import { Layout } from "@/components/layout";
import { SuspenseFallback } from "@/components/suspense-fallback";
import { ErifyGuard } from "@/livestream/components/erify-guard";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Navigate, Route, Routes } from "react-router";

import Dashboard from "./pages/dashboard";
import LoginPage from "./pages/login";

// livestream pages
const LivestreamDashboard = lazy(() => import("./pages/livestream/dashboard"));
const ShowPage = lazy(() => import("./pages/livestream/show"));
const ShowsPage = lazy(() => import("./pages/livestream/shows"));

// erify admin pages
const ErifyAdminDashboard = lazy(() => import("./pages/erify/admin/dashboard"));
const ErifyAdminBrands = lazy(() => import("./pages/erify/admin/brands"));
const ErifyAdminMaterials = lazy(() => import("./pages/erify/admin/materials"));
const ErifyAdminPlatforms = lazy(() => import("./pages/erify/admin/platforms"));
const ErifyAdminShows = lazy(() => import("./pages/erify/admin/shows"));
const ErifyAdminStudios = lazy(() => import("./pages/erify/admin/studios"));
const ErifyAdminTeams = lazy(() => import("./pages/erify/admin/teams"));
const ErifyAdminUsers = lazy(() => import("./pages/erify/admin/users"));

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
            <Route
              path="livestream"
              element={(
                <Suspense fallback={<SuspenseFallback />}>
                  <ErifyGuard />
                </Suspense>
              )}
            >
              <Route index element={<LivestreamDashboard />} />
              <Route path="shows" element={<ShowsPage />} />
              <Route path="shows/:show_uid" element={<ShowPage />} />
            </Route>
            <Route path="erify" element={<Navigate to="admin" />}>
              <Route
                path="admin"
                element={(
                  <Suspense fallback={<SuspenseFallback />}>
                    <ErifyAdmindGuard />
                  </Suspense>
                )}
              >
                <Route index element={<ErifyAdminDashboard />} />
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
