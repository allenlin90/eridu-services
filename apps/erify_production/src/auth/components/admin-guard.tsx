import { Unauthorized } from "@/auth/components/unauthorized";
import { useSession } from "@eridu/auth-service/hooks/use-session";
import { Outlet } from "react-router";

export const AdminGuard = () => {
  const { session } = useSession();

  if (session?.role === "admin") {
    return <Outlet />;
  }

  return <Unauthorized />;
};
