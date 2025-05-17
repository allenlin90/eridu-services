import useSession from "@eridu/auth-service/hooks/use-session";
import { useMemo } from "react";

import type { Membership } from "../types";

export const useSessionMemberships = () => {
  const { session } = useSession();

  return useMemo(() => {
    return (session?.memberships as Membership[]).reduce((store, membership) => {
      store.isErifyTeam = store.isErifyTeam || membership.organization.slug === "erify";
      store.isErifyAdmin = store.isErifyAdmin
      || (membership.organization.slug === "erify" && membership.role === "admin");

      return store;
    }, { isErifyTeam: false, isErifyAdmin: false });
  }, [session]);
};
