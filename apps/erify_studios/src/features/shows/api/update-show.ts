import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateShowInputSchema } from '@eridu/api-types/shows';

import type { Show } from './get-shows';

import { apiClient } from '@/lib/api/client';

export type UpdateShowDto = z.infer<typeof updateShowInputSchema>;

export async function updateShow({
  id,
  data,
}: {
  id: string;
  data: UpdateShowDto;
}): Promise<Show> {
  const response = await apiClient.patch<Show>(`/admin/shows/${id}`, data);
  return response.data;
}

export function useUpdateShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateShow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
    },
  });
}
