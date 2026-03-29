import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { UserApiResponse } from '@eridu/api-types/users';

import { apiClient } from '@/lib/api/client';

export type GetStudioCreatorOnboardingUsersParams = {
  search: string;
  limit?: number;
};

export const onboardingUsersKeys = {
  all: ['studio-creator-onboarding-users'] as const,
  lists: () => [...onboardingUsersKeys.all, 'list'] as const,
  listPrefix: (studioId: string) => [...onboardingUsersKeys.lists(), studioId] as const,
  list: (studioId: string, params: GetStudioCreatorOnboardingUsersParams) =>
    [...onboardingUsersKeys.listPrefix(studioId), params] as const,
};

export async function getStudioCreatorOnboardingUsers(
  studioId: string,
  params: GetStudioCreatorOnboardingUsersParams,
  options?: { signal?: AbortSignal },
): Promise<UserApiResponse[]> {
  const { data } = await apiClient.get<UserApiResponse[]>(
    `/studios/${studioId}/creators/onboarding-users`,
    {
      params: {
        search: params.search,
        limit: params.limit,
      },
      signal: options?.signal,
    },
  );
  return data;
}

export function useStudioCreatorOnboardingUsersQuery(
  studioId: string,
  params: GetStudioCreatorOnboardingUsersParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: onboardingUsersKeys.list(studioId, params),
    queryFn: ({ signal }) => getStudioCreatorOnboardingUsers(studioId, params, { signal }),
    enabled: enabled && Boolean(studioId) && params.search.trim().length > 0,
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
}
