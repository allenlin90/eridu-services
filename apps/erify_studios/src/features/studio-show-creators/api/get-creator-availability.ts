import { useQuery } from '@tanstack/react-query';

import type { CreatorApiResponse } from '@eridu/api-types/creators';

import { apiClient } from '@/lib/api/client';

export type AvailableCreator = CreatorApiResponse;

export type AvailabilityWindow = { dateFrom: string; dateTo: string };

export const creatorAvailabilityKeys = {
  all: ['creator-availability'] as const,
  list: (studioId: string, windows: AvailabilityWindow[]) =>
    [...creatorAvailabilityKeys.all, studioId, windows] as const,
};

export async function getCreatorAvailability(
  studioId: string,
  windows: AvailabilityWindow[],
): Promise<AvailableCreator[]> {
  const response = await apiClient.post<AvailableCreator[]>(
    `/studios/${studioId}/creators/availability:check`,
    {
      windows: windows.map((w) => ({ date_from: w.dateFrom, date_to: w.dateTo })),
    },
  );
  return response.data;
}

export function useCreatorAvailabilityQuery(
  studioId: string,
  windows: AvailabilityWindow[],
) {
  return useQuery({
    queryKey: creatorAvailabilityKeys.list(studioId, windows),
    queryFn: () => getCreatorAvailability(studioId, windows),
    enabled: Boolean(studioId && windows.length > 0),
  });
}
