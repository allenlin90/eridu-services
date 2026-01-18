import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deleteShowStandard(id: string): Promise<void> {
  await apiClient.delete(`/admin/show-standards/${id}`);
}

export function useDeleteShowStandard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShowStandard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-standards'] });
    },
  });
}
