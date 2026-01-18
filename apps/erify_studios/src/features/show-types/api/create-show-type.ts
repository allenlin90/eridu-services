import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { createShowTypeInputSchema } from '@eridu/api-types/show-types';

import type { ShowType } from './get-show-types';

import { apiClient } from '@/lib/api/client';

export type CreateShowTypeDto = z.infer<typeof createShowTypeInputSchema>;

export async function createShowType(data: CreateShowTypeDto): Promise<ShowType> {
  const response = await apiClient.post<ShowType>('/admin/show-types', data);
  return response.data;
}

export function useCreateShowType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShowType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-types'] });
    },
  });
}
