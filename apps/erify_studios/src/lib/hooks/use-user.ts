import { useQuery } from '@tanstack/react-query';

import { getUserProfile } from '@/lib/api/user';
import { useSession } from '@/lib/session-provider';

export const USER_PROFILE_KEY = ['me'] as const;
const USER_PROFILE_REVALIDATE_MS = 15 * 60 * 1000;

export function useUserProfile() {
  const { session } = useSession();

  return useQuery({
    queryKey: USER_PROFILE_KEY,
    queryFn: getUserProfile,
    enabled: !!session,
    retry: 1,
    staleTime: USER_PROFILE_REVALIDATE_MS,
    gcTime: 30 * 60 * 1000, // Keep cached profile available for fast route guards
    refetchInterval: USER_PROFILE_REVALIDATE_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true, // Refetch when user comes back to the tab
    refetchOnMount: true, // With staleTime this only revalidates once stale
    refetchOnReconnect: true, // Refetch when network reconnects
  });
}
