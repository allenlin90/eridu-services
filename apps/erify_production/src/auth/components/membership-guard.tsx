import type { Organization, Role, Team } from "@/auth/types";

import { Unauthorize } from "@/auth/components/unauthorize";
import { useActiveMembership } from "@/hooks/use-active-membership";
import { useMemo } from "react";
import { Outlet } from "react-router";

import { isMembershipAuthorized } from "../services/membership.service";

type MembershipGuardProps = {
  organizations?: Organization[];
  teams?: Team[];
  roles?: Role[];
};

export const MembershipGuard: React.FC<MembershipGuardProps> = ({ organizations, teams, roles }) => {
  const { activeMembership } = useActiveMembership();

  const isAuthorized = useMemo(() => {
    return isMembershipAuthorized(
      activeMembership,
      {
        organizations,
        teams,
        roles,
      },
    );
  }, [activeMembership, organizations, teams, roles]);

  if (!isAuthorized) {
    return <Unauthorize />;
  }

  return <Outlet />;
};

export default MembershipGuard;
