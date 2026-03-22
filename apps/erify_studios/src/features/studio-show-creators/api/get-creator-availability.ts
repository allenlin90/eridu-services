import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { StudioCreatorAvailabilityItem } from '@eridu/api-types/studio-creators';

import { apiClient } from '@/lib/api/client';

export type CreatorAvailabilityQuery = {
  date_from: string;
  date_to: string;
  search?: string;
  limit?: number;
};

export const creatorAvailabilityKeys = {
  all: ['creator-availability'] as const,
  list: (studioId: string, query: CreatorAvailabilityQuery) =>
    [...creatorAvailabilityKeys.all, studioId, query] as const,
};

export async function getCreatorAvailability(
  studioId: string,
  query: CreatorAvailabilityQuery,
  options?: { signal?: AbortSignal },
): Promise<StudioCreatorAvailabilityItem[]> {
  const response = await apiClient.get<StudioCreatorAvailabilityItem[]>(
    `/studios/${studioId}/creators/availability`,
    { params: query, signal: options?.signal },
  );
  return response.data;
}

export function useCreatorAvailabilityQuery(
  studioId: string,
  query: CreatorAvailabilityQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: creatorAvailabilityKeys.list(studioId, query),
    queryFn: ({ signal }) => getCreatorAvailability(studioId, query, { signal }),
    enabled: enabled && Boolean(studioId && query.date_from && query.date_to),
    placeholderData: keepPreviousData,
  });
}
