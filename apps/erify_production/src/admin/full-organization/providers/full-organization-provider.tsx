import type { Organization } from "@/admin/full-organization/types";

import { FullOrganizationContext } from "@/admin/full-organization/contexts/full-organization-context";
import { useMemo } from "react";

type FullOrganizationProviderProps = {
  organization: Organization;
};

export const FullOrganizationProvider: React.FC<React.PropsWithChildren<FullOrganizationProviderProps>>
 = ({ organization, children }) => {
   const value = useMemo(() => ({ organization }), [organization]);

   return (
     <FullOrganizationContext value={value}>
       {children}
     </FullOrganizationContext>
   );
 };

export default FullOrganizationProvider;
