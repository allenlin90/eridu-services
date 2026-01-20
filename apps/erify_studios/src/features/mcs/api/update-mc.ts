import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateMcInputSchema } from '@eridu/api-types/mcs';

import type { Mc } from './get-mcs';

import { apiClient } from '@/lib/api/client';

export type UpdateMcDto = z.infer<typeof updateMcInputSchema>;

export async function updateMc({ id, data }: { id: string; data: UpdateMcDto }): Promise<Mc> {
  const response = await apiClient.patch<Mc>(`/admin/mcs/${id}`, data);
  return response.data;
}

export function useUpdateMc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcs'] });
    },
  });
}
