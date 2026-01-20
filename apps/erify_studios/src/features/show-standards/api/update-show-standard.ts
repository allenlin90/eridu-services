import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateShowStandardInputSchema } from '@eridu/api-types/show-standards';

import type { ShowStandard } from './get-show-standards';

import { apiClient } from '@/lib/api/client';

export type UpdateShowStandardDto = z.infer<typeof updateShowStandardInputSchema>;

export async function updateShowStandard({ id, data }: { id: string; data: UpdateShowStandardDto }): Promise<ShowStandard> {
  const response = await apiClient.patch<ShowStandard>(`/admin/show-standards/${id}`, data);
  return response.data;
}

export function useUpdateShowStandard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateShowStandard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-standards'] });
    },
  });
}
