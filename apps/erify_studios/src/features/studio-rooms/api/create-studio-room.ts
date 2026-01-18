import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { createStudioRoomInputSchema } from '@eridu/api-types/studio-rooms';

import type { StudioRoom } from './get-studio-rooms';

import { apiClient } from '@/lib/api/client';

export type CreateStudioRoomDto = z.infer<typeof createStudioRoomInputSchema>;

export async function createStudioRoom(data: CreateStudioRoomDto): Promise<StudioRoom> {
  const response = await apiClient.post<StudioRoom>('/admin/studio-rooms', data);
  return response.data;
}

export function useCreateStudioRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStudioRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-rooms'] });
    },
  });
}
