import { useSession } from "@/auth/hooks/use-session";
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";

export const PrivateRouteGuard: React.FC<React.PropsWithChildren> = () => {
  const { data } = useSession();
  const { pathname } = useLocation();

  if (!data)
    return <Navigate to="/login" state={{ from: { pathname } }} />;

  return <Outlet />;
};

export default PrivateRouteGuard;
