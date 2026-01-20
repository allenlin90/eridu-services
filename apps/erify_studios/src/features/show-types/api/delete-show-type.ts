import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deleteShowType(id: string): Promise<void> {
  await apiClient.delete(`/admin/show-types/${id}`);
}

export function useDeleteShowType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShowType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-types'] });
    },
  });
}
