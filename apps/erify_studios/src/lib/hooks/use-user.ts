import { useQuery } from '@tanstack/react-query';

import { getUserProfile } from '@/lib/api/user';
import { useSession } from '@/lib/session-provider';

export const USER_PROFILE_KEY = ['me'] as const;

export function useUserProfile() {
  const { session } = useSession();

  return useQuery({
    queryKey: USER_PROFILE_KEY,
    queryFn: getUserProfile,
    enabled: !!session,
    retry: 1,
    // Stale while revalidate strategy
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for this long
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache for this long when inactive
    refetchOnWindowFocus: true, // Refetch when user comes back to the tab
    refetchOnMount: true, // Refetch when component mounts (if stale)
    refetchOnReconnect: true, // Refetch when network reconnects
  });
}
