import { PrivateRouteGuard } from '@/auth/components/private-route-guard';
import { PublicRouteGuard } from '@/auth/components/public-route-guard';
import { Layout } from '@/components/layout';
import { ErrorBoundary } from 'react-error-boundary';
import { Navigate, Route, Routes } from 'react-router';

import ErrorFallback from './components/error-fallback';
import LoginPage from './pages/login';

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Routes>
        <Route element={<Layout />}>
          <Route path='login' element={<PublicRouteGuard />}>
            <Route index element={<LoginPage />} />
          </Route>
          <Route path='/' element={<PrivateRouteGuard />}>
            <Route index />
          </Route>
          <Route path='*' element={<Navigate to='/' />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
