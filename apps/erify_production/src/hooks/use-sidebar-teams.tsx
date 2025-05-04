import type { Membership } from "@eridu/auth-service/types";
import type { AppSidebar } from "@eridu/ui/components/app-sidebar";

import { useActiveMembership } from "@/hooks/use-active-membership";
import useSession from "@eridu/auth-service/hooks/use-session";
import { useMemo } from "react";

type TeamMembership = React.ComponentProps<typeof AppSidebar>["teams"][0];

const renderLogo = (imgUrl?: string | null) => () => {
  if (!imgUrl)
    return null;

  return (
    <img
      src={imgUrl}
      alt="logo"
      className="h-8 w-8 object-cover"
    />
  );
};

export const useSidebarTeams = () => {
  const { session } = useSession();
  const { setActiveMembership } = useActiveMembership();

  return useMemo<TeamMembership[]>(() => {
    return (session?.memberships as Membership[]).map((membership, _i, memberships) => ({
      id: membership.id,
      name: membership.organization?.name,
      logo: renderLogo(membership.organization?.logo),
      plan: membership.role,
      onSwitchTeam: teamMembership => (_e) => {
        const membership = memberships.find(membership =>
          membership.id === teamMembership.id,
        );
        setActiveMembership(membership);
      },
    }));
  }, [session?.memberships, setActiveMembership]);
};
