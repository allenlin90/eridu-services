import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { createShowStandardInputSchema } from '@eridu/api-types/show-standards';

import type { ShowStandard } from './get-show-standards';

import { apiClient } from '@/lib/api/client';

export type CreateShowStandardDto = z.infer<typeof createShowStandardInputSchema>;

export async function createShowStandard(data: CreateShowStandardDto): Promise<ShowStandard> {
  const response = await apiClient.post<ShowStandard>('/admin/show-standards', data);
  return response.data;
}

export function useCreateShowStandard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShowStandard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-standards'] });
    },
  });
}
