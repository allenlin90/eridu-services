import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { PublishRunRow } from '@eridu/api-types/shows';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type GetPublishRunsParams = {
  page?: number;
  limit?: number;
};

export const publishRunKeys = {
  all: ['publish-runs'] as const,
  list: (studioId: string, params: GetPublishRunsParams) =>
    [...publishRunKeys.all, 'list', studioId, params] as const,
};

export async function getPublishRuns(
  studioId: string,
  params: GetPublishRunsParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<PublishRunRow>> {
  const response = await apiClient.get<PaginatedResponse<PublishRunRow>>(
    `/studios/${studioId}/shows/publish-runs`,
    { params, signal },
  );
  return response.data;
}

export function usePublishRunsQuery(studioId: string, params: GetPublishRunsParams) {
  return useQuery({
    queryKey: publishRunKeys.list(studioId, params),
    queryFn: ({ signal }) => getPublishRuns(studioId, params, signal),
    placeholderData: keepPreviousData,
    staleTime: 5000,
  });
}
