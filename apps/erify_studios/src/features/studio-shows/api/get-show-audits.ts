import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { AuditApiResponse } from '@eridu/api-types/audits';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type GetShowAuditsParams = {
  page?: number;
  limit?: number;
};

export const showAuditKeys = {
  all: ['show-audits'] as const,
  lists: () => [...showAuditKeys.all, 'list'] as const,
  listPrefix: (studioId: string, showId: string) => [...showAuditKeys.lists(), studioId, showId] as const,
  list: (studioId: string, showId: string, params: GetShowAuditsParams) =>
    [...showAuditKeys.listPrefix(studioId, showId), params] as const,
};

export async function getShowAudits(
  studioId: string,
  showId: string,
  params: GetShowAuditsParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<AuditApiResponse>> {
  const response = await apiClient.get<PaginatedResponse<AuditApiResponse>>(
    `/studios/${studioId}/shows/${showId}/audits`,
    { params, signal },
  );
  return response.data;
}

export function useShowAuditsQuery(
  studioId: string,
  showId: string,
  params: GetShowAuditsParams,
) {
  return useQuery({
    queryKey: showAuditKeys.list(studioId, showId, params),
    queryFn: ({ signal }) => getShowAudits(studioId, showId, params, signal),
    placeholderData: keepPreviousData,
    staleTime: 5000,
  });
}
