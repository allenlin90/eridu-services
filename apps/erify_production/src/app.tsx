import { MembershipGuard } from "@/auth/components/membership-guard";
import { PrivateRouteGuard } from "@/auth/components/private-route-guard";
import { PublicRouteGuard } from "@/auth/components/public-route-guard";
import { Organization, Team } from "@/auth/types";
import { ErrorFallback } from "@/components/error-fallback";
import { Layout } from "@/components/layout";
import { SuspenseFallback } from "@/components/suspense-fallback";
import { ROUTES } from "@/constants/routes";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Route, Routes } from "react-router";

import Dashboard from "./pages/dashboard";
import ForgetPasswordPage from "./pages/forget-password";
import LoginPage from "./pages/login";
import NotFound from "./pages/not-found";
import ResetPasswordPage from "./pages/reset-password";

// livestream pages
const LivestreamDashboard = lazy(() => import("./pages/livestream/dashboard"));
const ShowPage = lazy(() => import("./pages/livestream/show"));
const ShowsPage = lazy(() => import("./pages/livestream/shows"));

// erify offset pages
const ErifyMcAdmin = lazy(() => import("./pages/erify/offset/mc-admin"));
const ErifyScene = lazy(() => import("./pages/erify/offset/scene"));
const ErifyScript = lazy(() => import("./pages/erify/offset/script"));

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
          <Route element={<PublicRouteGuard />}>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.FORGET_PASSWORD} element={<ForgetPasswordPage />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
          </Route>
          <Route element={<PrivateRouteGuard />}>
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            <Route
              path={ROUTES.LIVESTREAM.BASE}
              element={(
                <Suspense fallback={<SuspenseFallback />}>
                  <MembershipGuard organizations={[Organization.Erify]} />
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
              <Route
                path={ROUTES.ERIFY.OFFSET.BASE}
                element={(
                  <Suspense>
                    <MembershipGuard organizations={[Organization.Erify]} teams={[Team.Offset]} />
                  </Suspense>
                )}
              >
                <Route path={ROUTES.ERIFY.OFFSET.MC_ADMIN} element={<ErifyMcAdmin />} />
                <Route path={ROUTES.ERIFY.OFFSET.SCENE} element={<ErifyScene />} />
                <Route path={ROUTES.ERIFY.OFFSET.SCRIPT} element={<ErifyScript />} />
              </Route>
              <Route
                path={ROUTES.ERIFY.ADMIN.BASE}
                element={(
                  <Suspense fallback={<SuspenseFallback />}>
                    <MembershipGuard organizations={[Organization.Erify]} roles={["admin"]} />
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
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
