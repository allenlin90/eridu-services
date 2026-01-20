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

export async function getPlatforms(params: GetPlatformsParams): Promise<PlatformsResponse> {
  const response = await apiClient.get<PlatformsResponse>('/admin/platforms', { params });
  return response.data;
}

export function usePlatformsQuery(params: GetPlatformsParams) {
  return useQuery({
    queryKey: ['platforms', 'list', params],
    queryFn: () => getPlatforms(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
