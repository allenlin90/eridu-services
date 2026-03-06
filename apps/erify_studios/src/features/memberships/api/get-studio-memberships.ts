import { useQuery } from '@tanstack/react-query';

import type { MembershipsResponse } from '@/features/memberships/api/get-memberships';
import { apiClient } from '@/lib/api/client';

export type GetStudioMembershipsParams = {
  page?: number;
  limit?: number;
  name?: string;
  id?: string;
};

export async function getStudioMemberships(
  studioId: string,
  params: GetStudioMembershipsParams,
): Promise<MembershipsResponse> {
  const response = await apiClient.get<MembershipsResponse>(
    `/studios/${studioId}/studio-memberships`,
    { params },
  );
  return response.data;
}

export function useStudioMembershipsQuery(
  studioId: string,
  params: GetStudioMembershipsParams,
  options?: {
    enabled?: boolean;
  },
) {
  return useQuery({
    queryKey: ['studio-memberships', 'list', studioId, params],
    queryFn: () => getStudioMemberships(studioId, params),
    placeholderData: (previousData: MembershipsResponse | undefined) => previousData,
    enabled: Boolean(studioId) && (options?.enabled ?? true),
  });
}
