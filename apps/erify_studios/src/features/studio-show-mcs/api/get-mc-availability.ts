import { useQuery } from '@tanstack/react-query';

import type { CreatorApiResponse } from '@eridu/api-types/creators';

import { apiClient } from '@/lib/api/client';

export type AvailableMc = CreatorApiResponse;

export const mcAvailabilityKeys = {
  all: ['mc-availability'] as const,
  list: (studioId: string, dateFrom: string, dateTo: string) =>
    [...mcAvailabilityKeys.all, studioId, dateFrom, dateTo] as const,
};

export async function getMcAvailability(
  studioId: string,
  dateFrom: string,
  dateTo: string,
): Promise<AvailableMc[]> {
  const response = await apiClient.get<AvailableMc[]>(
    `/studios/${studioId}/creators/availability`,
    { params: { date_from: dateFrom, date_to: dateTo } },
  );
  return response.data;
}

export function useMcAvailabilityQuery(
  studioId: string,
  dateFrom: string | undefined,
  dateTo: string | undefined,
) {
  return useQuery({
    queryKey: mcAvailabilityKeys.list(studioId, dateFrom ?? '', dateTo ?? ''),
    queryFn: () => getMcAvailability(studioId, dateFrom!, dateTo!),
    enabled: Boolean(studioId && dateFrom && dateTo),
  });
}
