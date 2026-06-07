import { useQuery } from '@tanstack/react-query';

import type { ShowPerformanceLoopsResponse } from '@eridu/api-types/performance';

import { studioPerformanceKeys } from './get-performance-summary';

import { apiClient } from '@/lib/api/client';

// Extend keys
export const studioPerformanceLoopsKeys = {
  ...studioPerformanceKeys,
  loops: (studioId: string, showId: string) => [...studioPerformanceKeys.all, 'loops', studioId, showId] as const,
};

export async function getPerformanceLoops(
  studioId: string,
  showId: string,
  options?: { signal?: AbortSignal },
): Promise<ShowPerformanceLoopsResponse> {
  const response = await apiClient.get<ShowPerformanceLoopsResponse>(
    `/studios/${studioId}/performance/shows/${showId}/loops`,
    {
      signal: options?.signal,
    },
  );
  return response.data;
}

export function usePerformanceLoopsQuery(studioId: string, showId: string) {
  return useQuery({
    queryKey: studioPerformanceLoopsKeys.loops(studioId, showId),
    queryFn: ({ signal }) => getPerformanceLoops(studioId, showId, { signal }),
    refetchOnWindowFocus: false,
  });
}
