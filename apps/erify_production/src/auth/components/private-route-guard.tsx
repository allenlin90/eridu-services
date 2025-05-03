import { useSession } from "@eridu/auth-service/hooks/use-session";
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";

export const PrivateRouteGuard: React.FC<React.PropsWithChildren> = () => {
  const { session } = useSession();
  const { pathname } = useLocation();

  if (!session) {
    return <Navigate to="/login" state={{ from: { pathname } }} />;
  }

  return <Outlet />;
};

export default PrivateRouteGuard;
