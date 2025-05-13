import type { Membership } from "@eridu/auth-service/types";
import type { AppSidebar } from "@eridu/ui/components/app-sidebar";

import { useActiveMembership } from "@/hooks/use-active-membership";
import useSession from "@eridu/auth-service/hooks/use-session";
import { useMemo } from "react";

import { useSetActiveTeam } from "./use-set-active-team";

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
  const { activeMembership, setActiveMembership } = useActiveMembership();
  const { mutate, isPending } = useSetActiveTeam();

  return useMemo<TeamMembership[]>(() => {
    return (session?.memberships as Membership[]).map((membership, _i, memberships) => ({
      id: membership.id,
      disabled: isPending,
      isActive: membership.id === activeMembership?.id,
      name: membership.organization?.name,
      logo: renderLogo(membership.organization?.logo),
      plan: membership.role,
      onSwitchTeam: teamMembership => async (_e) => {
        const membership = memberships.find(membership =>
          membership.id === teamMembership.id,
        );

        setActiveMembership(membership);

        if (membership) {
          mutate(membership.organization.id);
        }
      },
    }));
  }, [activeMembership, isPending, mutate, session?.memberships, setActiveMembership]);
};
