import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export async function deleteAdminTaskTemplate(templateId: string) {
  await apiClient.delete(`/admin/task-templates/${templateId}`);
}

export function useDeleteAdminTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAdminTaskTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-task-templates'] });
    },
  });
}
