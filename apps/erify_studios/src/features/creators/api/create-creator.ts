import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { createCreatorInputSchema } from '@eridu/api-types/creators';

import type { Creator } from './get-creators';

import { apiClient } from '@/lib/api/client';

export type CreateCreatorDto = z.infer<typeof createCreatorInputSchema>;

export async function createCreator(data: CreateCreatorDto): Promise<Creator> {
  const response = await apiClient.post<Creator>('/admin/creators', data);
  return response.data;
}

export function useCreateCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCreator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
}
