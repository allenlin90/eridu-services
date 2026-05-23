import { useQuery } from '@tanstack/react-query';

import type { ProfileResponse } from '@eridu/api-types/users';

import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import { useSession } from '@/lib/session-provider';

export const USER_PROFILE_KEY = queryKeys.me.profile();
const USER_PROFILE_REVALIDATE_MS = 15 * 60 * 1000;

export async function getUserProfile(): Promise<ProfileResponse> {
  const { data } = await apiClient.get<ProfileResponse>('/me');
  return data;
}

export function useUserProfile() {
  const { session } = useSession();

  return useQuery({
    queryKey: USER_PROFILE_KEY,
    queryFn: getUserProfile,
    enabled: !!session,
    retry: 1,
    staleTime: USER_PROFILE_REVALIDATE_MS,
    gcTime: 30 * 60 * 1000,
    refetchInterval: USER_PROFILE_REVALIDATE_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}
