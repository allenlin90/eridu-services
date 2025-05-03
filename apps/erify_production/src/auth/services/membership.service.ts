import type { Membership } from "@eridu/auth-service/types";

import type { Organization, Role, Team } from "../types";

type IsMembershipAuthorizedArgs = {
  membership: Membership;
  organizations?: Organization[];
  teams?: Team[];
  roles?: Role[];
};

export const isMembershipAuthorized = ({ membership, organizations, teams, roles }: IsMembershipAuthorizedArgs) => {
  if (!membership)
    return false;

  const { organization, team, role } = membership;

  const isOrgAuthorized = !organizations || organizations.includes(organization.slug as Organization);

  const isTeamAuthorized = !teams || (team && teams.includes(team.name as Team));

  const isRoleAuthorized = !roles || roles.includes(role as Role);

  return isOrgAuthorized && isTeamAuthorized && isRoleAuthorized;
};
