import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateShowStatusInputSchema } from '@eridu/api-types/show-statuses';

import type { ShowStatus } from './get-show-statuses';

import { apiClient } from '@/lib/api/client';

export type UpdateShowStatusDto = z.infer<typeof updateShowStatusInputSchema>;

export async function updateShowStatus({ id, data }: { id: string; data: UpdateShowStatusDto }): Promise<ShowStatus> {
  const response = await apiClient.patch<ShowStatus>(`/admin/show-statuses/${id}`, data);
  return response.data;
}

export function useUpdateShowStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateShowStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-statuses'] });
    },
  });
}
