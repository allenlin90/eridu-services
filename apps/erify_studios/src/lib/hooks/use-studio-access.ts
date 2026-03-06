import { useCallback, useMemo } from 'react';

import type { StudioRole } from '@eridu/api-types/memberships';

import {
  hasStudioRouteAccess,
  type StudioRouteAccessKey,
} from '@/lib/constants/studio-route-access';
import { useUserProfile } from '@/lib/hooks/use-user';

export function useStudioAccess(studioId: string) {
  const { data: profile, isLoading } = useUserProfile();

  const membership = useMemo(
    () => profile?.studio_memberships?.find((item) => item.studio.uid === studioId) ?? null,
    [profile?.studio_memberships, studioId],
  );

  const role = membership?.role as StudioRole | undefined;
  const hasAccess = useCallback(
    (routeKey: StudioRouteAccessKey) => hasStudioRouteAccess(role ?? null, routeKey),
    [role],
  );

  return {
    isLoading,
    membership,
    role: role ?? null,
    hasAccess,
  };
}
