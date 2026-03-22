import type { ShowApiResponse } from '@eridu/api-types/shows';

import { apiClient } from '@/lib/api/client';

export type StudioShowDetail = ShowApiResponse;

export const studioShowKeys = {
  all: ['studio-show'] as const,
  detail: (studioId: string, showId: string) => [...studioShowKeys.all, studioId, showId] as const,
};

export async function getStudioShow(
  studioId: string,
  showId: string,
  options?: { signal?: AbortSignal },
): Promise<StudioShowDetail> {
  const response = await apiClient.get<StudioShowDetail>(
    `/studios/${studioId}/shows/${showId}`,
    { signal: options?.signal },
  );
  return response.data;
}
