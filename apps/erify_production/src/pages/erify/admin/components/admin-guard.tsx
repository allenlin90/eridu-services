import { Unauthorize } from "@/auth/components/unauthorize";
import { useSessionMemberships } from "@/auth/hooks/use-session-memberships";
import { Outlet } from "react-router";

export const ErifyAdmindGuard: React.FC = () => {
  const { isErifyAdmin } = useSessionMemberships();

  if (!isErifyAdmin)
    return <Unauthorize />;

  return <Outlet />;
};

export default ErifyAdmindGuard;
