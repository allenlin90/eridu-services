import { ErifyAdmindGuard } from "@/admin/components/admin-guard";
import { PrivateRouteGuard } from "@/auth/components/private-route-guard";
import { PublicRouteGuard } from "@/auth/components/public-route-guard";
import { ErrorFallback } from "@/components/error-fallback";
import { Layout } from "@/components/layout";
import { SuspenseFallback } from "@/components/suspense-fallback";
import { ROUTES } from "@/constants/routes";
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
          <Route path={ROUTES.LOGIN} element={<PublicRouteGuard />}>
            <Route index element={<LoginPage />} />
          </Route>
          <Route path={ROUTES.DASHBOARD} element={<PrivateRouteGuard />}>
            <Route index element={<Dashboard />} />
            <Route
              path={ROUTES.LIVESTREAM.BASE}
              element={(
                <Suspense fallback={<SuspenseFallback />}>
                  <ErifyGuard />
                </Suspense>
              )}
            >
              <Route index element={<LivestreamDashboard />} />
              <Route path={ROUTES.LIVESTREAM.SHOWS} element={<ShowsPage />} />
              <Route
                path={ROUTES.LIVESTREAM.SHOW_DETAILS(":show_uid")}
                element={<ShowPage />}
              />
            </Route>
            <Route path={ROUTES.ERIFY.BASE}>
              <Route index element={<Navigate to={ROUTES.ERIFY.ADMIN.BASE} />} />
              <Route
                path={ROUTES.ERIFY.ADMIN.BASE}
                element={(
                  <Suspense fallback={<SuspenseFallback />}>
                    <ErifyAdmindGuard />
                  </Suspense>
                )}
              >
                <Route index element={<ErifyAdminDashboard />} />
                <Route path={ROUTES.ERIFY.ADMIN.BRANDS} element={<ErifyAdminBrands />} />
                <Route path={ROUTES.ERIFY.ADMIN.MATERIALS} element={<ErifyAdminMaterials />} />
                <Route path={ROUTES.ERIFY.ADMIN.PLATFORMS} element={<ErifyAdminPlatforms />} />
                <Route path={ROUTES.ERIFY.ADMIN.SHOWS} element={<ErifyAdminShows />} />
                <Route path={ROUTES.ERIFY.ADMIN.STUDIOS} element={<ErifyAdminStudios />} />
                <Route path={ROUTES.ERIFY.ADMIN.TEAMS} element={<ErifyAdminTeams />} />
                <Route path={ROUTES.ERIFY.ADMIN.USERS} element={<ErifyAdminUsers />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
