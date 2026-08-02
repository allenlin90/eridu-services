import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ShowIssueApiResponse } from '@eridu/api-types/show-issues';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type GetShowIssuesParams = {
  page?: number;
  limit?: number;
  show_id: string;
  status?: string;
  severity?: string;
  category?: string;
  owner_id?: string;
  search?: string;
};

export const showIssueKeys = {
  all: ['show-issues'] as const,
  lists: () => [...showIssueKeys.all, 'list'] as const,
  listPrefix: (studioId: string, showId: string) => [...showIssueKeys.lists(), studioId, showId] as const,
  list: (studioId: string, showId: string, params: GetShowIssuesParams) =>
    [...showIssueKeys.listPrefix(studioId, showId), params] as const,
  detail: (studioId: string, issueId: string) => [...showIssueKeys.all, 'detail', studioId, issueId] as const,
};

export async function getShowIssues(
  studioId: string,
  params: GetShowIssuesParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<ShowIssueApiResponse>> {
  const response = await apiClient.get<PaginatedResponse<ShowIssueApiResponse>>(
    `/studios/${studioId}/show-issues`,
    { params, signal },
  );
  return response.data;
}

export function useShowIssuesQuery(studioId: string, params: GetShowIssuesParams) {
  return useQuery({
    queryKey: showIssueKeys.list(studioId, params.show_id, params),
    queryFn: ({ signal }) => getShowIssues(studioId, params, signal),
    placeholderData: keepPreviousData,
    enabled: Boolean(studioId && params.show_id),
    staleTime: 20_000,
  });
}
