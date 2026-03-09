import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deleteCreator(id: string): Promise<void> {
  await apiClient.delete(`/admin/creators/${id}`);
}

export function useDeleteCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCreator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
}
