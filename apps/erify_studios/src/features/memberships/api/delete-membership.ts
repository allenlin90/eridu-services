import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deleteMembership(id: string): Promise<void> {
  await apiClient.delete(`/admin/studio-memberships/${id}`);
}

export function useDeleteMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMembership,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
}
