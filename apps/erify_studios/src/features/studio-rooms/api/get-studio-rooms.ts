import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { StudioRoomApiResponse } from '@eridu/api-types/studio-rooms';

import type { PaginatedResponse } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

export type StudioRoom = StudioRoomApiResponse;
export type StudioRoomsResponse = PaginatedResponse<StudioRoom>;

export type GetStudioRoomsParams = {
  page?: number;
  limit?: number;
  studio_id: string;
  name?: string;
  id?: string;
};

export async function getStudioRooms(params: GetStudioRoomsParams): Promise<StudioRoomsResponse> {
  const response = await apiClient.get<StudioRoomsResponse>('/admin/studio-rooms', { params });
  return response.data;
}

export function useStudioRoomsQuery(params: GetStudioRoomsParams) {
  return useQuery({
    queryKey: ['studio-rooms', 'list', params],
    queryFn: () => getStudioRooms(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
