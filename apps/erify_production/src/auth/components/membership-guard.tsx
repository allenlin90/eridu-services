import type { Organization, Role, Team } from "@/auth/types";

import { Unauthorize } from "@/auth/components/unauthorize";
import { useActiveMembership } from "@/hooks/use-active-membership";
import { useMemo } from "react";
import { Outlet } from "react-router";

type MembershipGuardProps = {
  organizations?: Organization[];
  teams?: Team[];
  roles?: Role[];
};

export const MembershipGuard: React.FC<MembershipGuardProps> = ({ organizations, teams, roles }) => {
  const { activeMembership } = useActiveMembership();

  const isAuthorized = useMemo(() => {
    if (!activeMembership)
      return false;

    const { organization, team, role } = activeMembership ?? {};

    const isOrgAuthorized = !organizations || organizations.includes(organization.slug as Organization);

    const isTeamAuthorized = !teams || (team && teams.includes(team.name as Team));

    const isRoleAuthorized = !roles || roles.includes(role as Role);

    return isOrgAuthorized && isTeamAuthorized && isRoleAuthorized;
  }, [activeMembership, organizations, teams, roles]);

  if (!isAuthorized) {
    return <Unauthorize />;
  }

  return <Outlet />;
};

export default MembershipGuard;
