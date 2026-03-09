import { useQuery } from '@tanstack/react-query';

import type { CreatorApiResponse } from '@eridu/api-types/creators';

import { apiClient } from '@/lib/api/client';

export type AvailableCreator = CreatorApiResponse;

export const creatorAvailabilityKeys = {
  all: ['creator-availability'] as const,
  list: (studioId: string, dateFrom: string, dateTo: string) =>
    [...creatorAvailabilityKeys.all, studioId, dateFrom, dateTo] as const,
};

export async function getCreatorAvailability(
  studioId: string,
  dateFrom: string,
  dateTo: string,
): Promise<AvailableCreator[]> {
  const response = await apiClient.get<AvailableCreator[]>(
    `/studios/${studioId}/creators/availability`,
    { params: { date_from: dateFrom, date_to: dateTo } },
  );
  return response.data;
}

export function useCreatorAvailabilityQuery(
  studioId: string,
  dateFrom: string | undefined,
  dateTo: string | undefined,
) {
  return useQuery({
    queryKey: creatorAvailabilityKeys.list(studioId, dateFrom ?? '', dateTo ?? ''),
    queryFn: () => getCreatorAvailability(studioId, dateFrom!, dateTo!),
    enabled: Boolean(studioId && dateFrom && dateTo),
  });
}
