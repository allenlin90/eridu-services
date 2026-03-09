import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateCreatorInputSchema } from '@eridu/api-types/creators';

import type { Creator } from './get-creators';

import { apiClient } from '@/lib/api/client';

export type UpdateCreatorDto = z.infer<typeof updateCreatorInputSchema>;

export async function updateCreator({ id, data }: { id: string; data: UpdateCreatorDto }): Promise<Creator> {
  const response = await apiClient.patch<Creator>(`/admin/creators/${id}`, data);
  return response.data;
}

export function useUpdateCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCreator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
}
