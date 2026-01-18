import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deletePlatform(id: string): Promise<void> {
  await apiClient.delete(`/admin/platforms/${id}`);
}

export function useDeletePlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
    },
  });
}
