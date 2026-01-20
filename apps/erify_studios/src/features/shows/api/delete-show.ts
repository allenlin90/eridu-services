import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deleteShow(id: string): Promise<void> {
  await apiClient.delete(`/admin/shows/${id}`);
}

export function useDeleteShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteShow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
    },
  });
}
