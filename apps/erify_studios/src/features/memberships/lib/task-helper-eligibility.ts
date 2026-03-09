import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import type { Membership } from '@/features/memberships/api/get-memberships';

export function isTaskHelperEligibleMember(member: Membership): boolean {
  return member.role === STUDIO_ROLE.ADMIN
    || member.role === STUDIO_ROLE.MANAGER
    || Boolean(member.is_helper);
}
