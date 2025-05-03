import type { Membership } from "@eridu/auth-service/types";

import { createContext } from "react";

type MembershipContextType = {
  activeMembership: Membership | undefined;
  setActiveMembership: React.Dispatch<React.SetStateAction<Membership | undefined>>;
};

export const MembershipContext = createContext<MembershipContextType | null>(null);
