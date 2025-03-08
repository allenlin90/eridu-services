import { useSession } from '@/auth/hooks/use-session';
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

export const PrivateRouteGuard: React.FC<React.PropsWithChildren> = () => {
  const { isSignedIn } = useSession();
  const { pathname } = useLocation();

  if (!isSignedIn)
    return <Navigate to='/login' state={{ from: { pathname } }} />;

  return <Outlet />;
};

export default PrivateRouteGuard;
