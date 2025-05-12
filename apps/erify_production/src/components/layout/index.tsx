import { useSession } from "@eridu/auth-service/hooks/use-session";
import { Toaster } from "@eridu/ui/components/toaster";
import { LoaderCircle } from "lucide-react";
import { Outlet } from "react-router";

import { NavLayout } from "./nav-layout";

export const Layout: React.FC<React.PropsWithChildren> = () => {
  const { loading, session } = useSession();

  if (loading) {
    return (
      <div className="h-screen w-screen flex justify-center items-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  if (session) {
    return (
      <NavLayout>
        <Outlet />
        <Toaster />
      </NavLayout>
    );
  }

  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
};
