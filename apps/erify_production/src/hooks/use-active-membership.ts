import { MembershipContext } from "@/contexts/membership-context";
import { useContext } from "react";

export const useActiveMembership = () => {
  const ctx = useContext(MembershipContext);

  if (!ctx) {
    throw new Error("useActiveMembership can only be used in MembershipContext");
  }

  return ctx;
};
