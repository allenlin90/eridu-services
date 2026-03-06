import { useQuery } from '@tanstack/react-query';

import type { StudioShowLookupsDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

const LOOKUP_STALE_TIME_MS = 60 * 60 * 1000;

export const showLookupsKeys = {
  all: ['show-lookups'] as const,
  detail: (studioId: string) => [...showLookupsKeys.all, studioId] as const,
};

export async function getShowLookups(studioId: string): Promise<StudioShowLookupsDto> {
  const response = await apiClient.get<StudioShowLookupsDto>(`/studios/${studioId}/show-lookups`);
  return response.data;
}

export function useShowLookupsQuery(studioId: string) {
  return useQuery({
    queryKey: showLookupsKeys.detail(studioId),
    queryFn: () => getShowLookups(studioId),
    enabled: Boolean(studioId),
    staleTime: LOOKUP_STALE_TIME_MS,
    gcTime: 2 * 60 * 60 * 1000,
  });
}
