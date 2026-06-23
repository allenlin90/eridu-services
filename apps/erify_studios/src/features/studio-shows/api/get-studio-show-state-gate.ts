import { useQuery } from '@tanstack/react-query';

import type { StudioShowStateGate } from '@eridu/api-types/shows';

import { apiClient } from '@/lib/api/client';

export const studioShowStateGateKeys = {
  all: ['studio-show-state-gate'] as const,
  detail: (studioId: string, showId: string) =>
    [...studioShowStateGateKeys.all, studioId, showId] as const,
};

export async function getStudioShowStateGate(
  studioId: string,
  showId: string,
  options?: { signal?: AbortSignal },
): Promise<StudioShowStateGate> {
  const response = await apiClient.get<StudioShowStateGate>(
    `/studios/${studioId}/shows/${showId}/state-gate`,
    { signal: options?.signal },
  );
  return response.data;
}

export function useStudioShowStateGate(
  studioId: string,
  showId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: studioShowStateGateKeys.detail(studioId, showId),
    queryFn: ({ signal }) => getStudioShowStateGate(studioId, showId, { signal }),
    enabled: Boolean(studioId && showId) && (options?.enabled ?? true),
  });
}
