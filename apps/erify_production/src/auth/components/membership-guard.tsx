import type { Organization, Role, Team } from "@/auth/types";

import { Unauthorize } from "@/auth/components/unauthorize";
import { useMemo } from "react";
import { Outlet } from "react-router";

import { useActiveMembership } from "../hooks/use-active-membership";

type MembershipGuardProps = {
  organizations?: Organization[];
  teams?: Team[];
  roles?: Role[];
};

export const MembershipGuard: React.FC<MembershipGuardProps> = ({ organizations, teams, roles }) => {
  const membership = useActiveMembership();

  const isAuthorized = useMemo(() => {
    if (!membership)
      return false;

    const { organization, team, role } = membership;

    const isOrgAuthorized = !organizations || organizations.includes(organization.slug);

    const isTeamAuthorized = !teams || (team && teams.includes(team.name));

    const isRoleAuthorized = !roles || roles.includes(role);

    return isOrgAuthorized && isTeamAuthorized && isRoleAuthorized;
  }, [membership, organizations, teams, roles]);

  if (!isAuthorized) {
    return <Unauthorize />;
  }

  return <Outlet />;
};

export default MembershipGuard;
