import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { createStudioInputSchema } from '@eridu/api-types/studios';

import type { Studio } from './get-studios';

import { apiClient } from '@/lib/api/client';

export type CreateStudioDto = z.infer<typeof createStudioInputSchema>;

export async function createStudio(data: CreateStudioDto): Promise<Studio> {
  const response = await apiClient.post<Studio>('/admin/studios', data);
  return response.data;
}

export function useCreateStudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStudio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studios'] });
    },
  });
}
