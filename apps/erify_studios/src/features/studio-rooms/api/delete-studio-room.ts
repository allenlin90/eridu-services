import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deleteStudioRoom(id: string): Promise<void> {
  await apiClient.delete(`/admin/studio-rooms/${id}`);
}

export function useDeleteStudioRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStudioRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-rooms'] });
    },
  });
}
