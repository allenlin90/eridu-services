import type { Membership } from "@eridu/auth-service/types";

import { MembershipContext } from "@/contexts/membership-context";
import { useSession } from "@eridu/auth-service/hooks/use-session";
import { useMemo, useState } from "react";

export const MembershipProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { session } = useSession();
  const [activeMembership, setActiveMembership] = useState<Membership>();

  const value = useMemo(() => {
    const { activeOrganizationId } = session ?? {};
    const membership = (session?.memberships ?? [])
      .find(membership => membership.organization.id === activeOrganizationId);

    return {
      activeMembership: activeMembership || membership || session?.memberships[0],
      setActiveMembership,
    };
  }, [session, activeMembership, setActiveMembership]);

  return (
    <MembershipContext value={value}>
      {children}
    </MembershipContext>
  );
};
