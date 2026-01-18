import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deleteStudio(id: string): Promise<void> {
  await apiClient.delete(`/admin/studios/${id}`);
}

export function useDeleteStudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStudio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studios'] });
    },
  });
}
