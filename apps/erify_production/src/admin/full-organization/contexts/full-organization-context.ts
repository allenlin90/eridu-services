import type { Organization } from "@/admin/full-organization/types";

import { createContext } from "react";

type FullOrganizationContextType = {
  organization: Organization;
};

export const FullOrganizationContext = createContext<FullOrganizationContextType | null>(null);
