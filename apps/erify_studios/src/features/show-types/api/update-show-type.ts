import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateShowTypeInputSchema } from '@eridu/api-types/show-types';

import type { ShowType } from './get-show-types';

import { apiClient } from '@/lib/api/client';

export type UpdateShowTypeDto = z.infer<typeof updateShowTypeInputSchema>;

export async function updateShowType({ id, data }: { id: string; data: UpdateShowTypeDto }): Promise<ShowType> {
  const response = await apiClient.patch<ShowType>(`/admin/show-types/${id}`, data);
  return response.data;
}

export function useUpdateShowType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateShowType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-types'] });
    },
  });
}
