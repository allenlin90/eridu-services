import { FullOrganizationContext } from "@/admin/full-organization/contexts/full-organization-context";
import { useContext } from "react";

export const useFullOrganization = () => {
  const ctx = useContext(FullOrganizationContext);

  if (!ctx) {
    throw new Error("useFullOrganization can only be used in FullOrganizationContext");
  }

  return ctx;
};
