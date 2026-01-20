import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateStudioRoomInputSchema } from '@eridu/api-types/studio-rooms';

import type { StudioRoom } from './get-studio-rooms';

import { apiClient } from '@/lib/api/client';

export type UpdateStudioRoomDto = z.infer<typeof updateStudioRoomInputSchema>;

export async function updateStudioRoom({ id, data }: { id: string; data: UpdateStudioRoomDto }): Promise<StudioRoom> {
  const response = await apiClient.patch<StudioRoom>(`/admin/studio-rooms/${id}`, data);
  return response.data;
}

export function useUpdateStudioRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStudioRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-rooms'] });
    },
  });
}
