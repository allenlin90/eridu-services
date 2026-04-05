import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { StudioRoomApiResponse } from '@eridu/api-types/studio-rooms';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type StudioRoom = StudioRoomApiResponse;
export type StudioRoomsResponse = PaginatedResponse<StudioRoom>;

export type GetStudioRoomsParams = {
  page?: number;
  limit?: number;
  studio_id?: string;
  name?: string;
  id?: string;
};

type GetStudioRoomsOptions = {
  signal?: AbortSignal;
};

export async function getStudioRooms(
  params: GetStudioRoomsParams,
  studioId?: string,
  options?: GetStudioRoomsOptions,
): Promise<StudioRoomsResponse> {
  const endpoint = studioId ? `/studios/${studioId}/studio-rooms` : '/admin/studio-rooms';
  const requestParams = studioId
    ? {
        page: params.page,
        limit: params.limit,
        name: params.name,
        id: params.id,
      }
    : params;
  const response = await apiClient.get<StudioRoomsResponse>(endpoint, { params: requestParams, signal: options?.signal });
  return response.data;
}

export function useStudioRoomsQuery(params: GetStudioRoomsParams) {
  return useQuery({
    queryKey: ['studio-rooms', 'list', params],
    queryFn: () => getStudioRooms(params),
    placeholderData: keepPreviousData,
  });
}
