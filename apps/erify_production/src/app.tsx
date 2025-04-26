import { PrivateRouteGuard } from "@/auth/components/private-route-guard";
import { PublicRouteGuard } from "@/auth/components/public-route-guard";
import { Layout } from "@/components/layout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Navigate, Route, Routes } from "react-router";

import ErrorFallback from "./components/error-fallback";
import Dashboard from "./pages/dashboard";
import LoginPage from "./pages/login";

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="login" element={<PublicRouteGuard />}>
              <Route index element={<LoginPage />} />
            </Route>
            <Route path="/" element={<PrivateRouteGuard />}>
              <Route index element={<Dashboard />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
