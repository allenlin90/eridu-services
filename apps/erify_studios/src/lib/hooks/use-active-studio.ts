import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import type { ProfileResponse } from '@eridu/api-types/users';

import { useUserProfile } from '@/lib/hooks/use-user';

export type Membership = NonNullable<
  ProfileResponse['studio_memberships']
>[number];

export function useActiveStudio() {
  const { data: userProfile } = useUserProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const studios = useMemo(
    () => userProfile?.studio_memberships || [],
    [userProfile?.studio_memberships],
  );

  // Initialize with null to avoid race condition
  const [activeStudioId, setActiveStudioId] = useLocalStorage<string | null>(
    'lastActiveStudioId',
    null,
  );

  // Initialize activeStudioId when studios load
  useEffect(() => {
    if (!activeStudioId && studios.length > 0) {
      setActiveStudioId(studios[0].studio.uid);
    }
  }, [activeStudioId, studios, setActiveStudioId]);

  const activeStudio = useMemo(() => {
    return (
      studios.find((m: Membership) => m.studio.uid === activeStudioId)
      || studios[0]
    );
  }, [studios, activeStudioId]);

  const switchStudio = useCallback(
    (studioId: string) => {
      const previousStudioId = activeStudioId;
      setActiveStudioId(studioId);

      // Invalidate both old and new studio queries
      if (previousStudioId) {
        queryClient.invalidateQueries({
          queryKey: ['studios', previousStudioId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['studios', studioId],
      });

      // Always navigate to the new studio context
      navigate({
        to: '/studios/$studioId/dashboard',
        params: { studioId },
      });
    },
    [navigate, queryClient, setActiveStudioId, activeStudioId],
  );

  return {
    activeStudio,
    studios,
    switchStudio,
    activeStudioId,
  };
}
