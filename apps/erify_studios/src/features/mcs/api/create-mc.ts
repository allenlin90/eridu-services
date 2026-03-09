import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { createCreatorInputSchema } from '@eridu/api-types/creators';

import type { Mc } from './get-mcs';

import { apiClient } from '@/lib/api/client';

export type CreateMcDto = z.infer<typeof createCreatorInputSchema>;

export async function createMc(data: CreateMcDto): Promise<Mc> {
  const response = await apiClient.post<Mc>('/admin/creators', data);
  return response.data;
}

export function useCreateMc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcs'] });
    },
  });
}
