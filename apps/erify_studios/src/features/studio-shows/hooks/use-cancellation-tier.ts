import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import { useDutyManager } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';
import { useUserProfile } from '@/lib/hooks/use-user';

export type CancellationTier = 'manager' | 'duty_manager' | null;

export function useCancellationTier(studioId: string): { tier: CancellationTier; isLoading: boolean } {
  const { role, isLoading: isRoleLoading } = useStudioAccess(studioId);
  const { data: profile, isLoading: isProfileLoading } = useUserProfile();
  const { data: dutyManager, isLoading: isDutyManagerLoading } = useDutyManager(studioId);

  const isLoading = isRoleLoading || isProfileLoading || isDutyManagerLoading;

  if (role === STUDIO_ROLE.ADMIN || role === STUDIO_ROLE.MANAGER) {
    return { tier: 'manager', isLoading };
  }

  if (profile?.id && dutyManager?.user_id === profile.id) {
    return { tier: 'duty_manager', isLoading };
  }

  return { tier: null, isLoading };
}
