import { useMemo } from "react";

import { isMembershipAuthorized } from "../services/membership.service";
import { useActiveMembership } from "./use-active-membership";

type useMembershipGuardProps = Parameters<typeof isMembershipAuthorized>[1];

export const useMembershipGuard = ({ organizations, teams, roles }: useMembershipGuardProps) => {
  const membership = useActiveMembership();

  return useMemo(() => {
    return isMembershipAuthorized(membership, {
      organizations,
      teams,
      roles,
    });
  }, [membership, organizations, teams, roles]);
};
