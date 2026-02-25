import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deleteAdminTask(id: string): Promise<void> {
  await apiClient.delete(`/admin/tasks/${id}`);
}

export function useDeleteAdminTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAdminTask,
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.removeQueries({ queryKey: ['admin-tasks', 'detail', id] });
    },
  });
}
