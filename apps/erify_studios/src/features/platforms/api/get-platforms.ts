import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { PlatformApiResponse } from '@eridu/api-types/platforms';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type Platform = PlatformApiResponse;
export type PlatformsResponse = PaginatedResponse<Platform>;

export type GetPlatformsParams = {
  page?: number;
  limit?: number;
  name?: string;
  id?: string;
};

export async function getPlatforms(
  params: GetPlatformsParams,
  studioId?: string,
): Promise<PlatformsResponse> {
  const endpoint = studioId ? `/studios/${studioId}/platforms` : '/admin/platforms';
  const response = await apiClient.get<PlatformsResponse>(endpoint, { params });
  return response.data;
}

export function usePlatformsQuery(params: GetPlatformsParams) {
  return useQuery({
    queryKey: ['platforms', 'list', params],
    queryFn: () => getPlatforms(params),
    placeholderData: keepPreviousData,
  });
}
