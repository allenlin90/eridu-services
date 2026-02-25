import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { createShowStatusInputSchema } from '@eridu/api-types/show-statuses';

import type { ShowStatus } from './get-show-statuses';

import { apiClient } from '@/lib/api/client';

export type CreateShowStatusDto = z.infer<typeof createShowStatusInputSchema>;

export async function createShowStatus(data: CreateShowStatusDto): Promise<ShowStatus> {
  const response = await apiClient.post<ShowStatus>('/admin/show-statuses', data);
  return response.data;
}

export function useCreateShowStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShowStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show-statuses'] });
    },
  });
}
