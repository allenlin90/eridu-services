import { useSession } from '@/auth/hooks/use-session';
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

export const PublicRouteGuard: React.FC<React.PropsWithChildren> = () => {
  const { isSignedIn } = useSession();
  const { state } = useLocation();
  const from = state?.from?.pathname || '/';

  if (isSignedIn) return <Navigate to={from} />;

  return <Outlet />;
};

export default PublicRouteGuard;
