import Unauthorize from "@/auth/components/unauthorize";
import { useSessionMemberships } from "@/auth/hooks/use-session-memberships";
import { Outlet } from "react-router";

export const ErifyGuard: React.FC = () => {
  const { isErifyTeam } = useSessionMemberships();

  if (!isErifyTeam)
    return <Unauthorize />;

  return <Outlet />;
};
