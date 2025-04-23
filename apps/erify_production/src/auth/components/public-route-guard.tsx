import { useSession } from "@eridu/auth-service/hooks/use-session";
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";

export const PublicRouteGuard: React.FC<React.PropsWithChildren> = () => {
  const { session } = useSession();
  const { state } = useLocation();
  const from = state?.from?.pathname || "/";

  if (session)
    return <Navigate to={from} />;

  return <Outlet />;
};

export default PublicRouteGuard;
