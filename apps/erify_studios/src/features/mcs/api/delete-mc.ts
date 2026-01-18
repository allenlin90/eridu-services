import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deleteMc(id: string): Promise<void> {
  await apiClient.delete(`/admin/mcs/${id}`);
}

export function useDeleteMc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcs'] });
    },
  });
}
