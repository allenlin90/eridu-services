import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import type { ProfileResponse } from '@eridu/api-types/users';

import { queryKeys } from '@/lib/api/query-keys';
import { useUserProfile } from '@/lib/hooks/use-user';

export type CreatorStudioCreator = NonNullable<
  NonNullable<ProfileResponse['creator']>['studio_creators']
>[number];

export function useActiveStudio() {
  const { data: userProfile } = useUserProfile();
  const queryClient = useQueryClient();

  // Filter only active studio associations
  const studios = useMemo(
    () => userProfile?.creator?.studio_creators?.filter((sc) => sc.is_active) || [],
    [userProfile?.creator?.studio_creators],
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
    if (studios.length === 0)
      return null;
    return (
      studios.find((sc) => sc.studio.uid === activeStudioId)
      || studios[0]
    );
  }, [studios, activeStudioId]);

  const switchStudio = useCallback(
    (studioId: string) => {
      setActiveStudioId(studioId);

      // Invalidate shows list queries to ensure fresh data for the newly selected studio
      queryClient.invalidateQueries({
        queryKey: queryKeys.shows.all,
      });
    },
    [queryClient, setActiveStudioId],
  );

  return {
    activeStudio,
    studios,
    switchStudio,
    activeStudioId: activeStudio?.studio?.uid || null,
  };
}
