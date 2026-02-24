import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deleteShowStatus(id: string): Promise<void> {
  await apiClient.delete(`/admin/show-statuses/${id}`);
}

export function useDeleteShowStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShowStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-statuses'] });
    },
  });
}
