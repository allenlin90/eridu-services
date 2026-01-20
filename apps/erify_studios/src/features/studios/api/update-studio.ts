import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateStudioInputSchema } from '@eridu/api-types/studios';

import type { Studio } from './get-studios';

import { apiClient } from '@/lib/api/client';

export type UpdateStudioDto = z.infer<typeof updateStudioInputSchema>;

export async function updateStudio({
  id,
  data,
}: {
  id: string;
  data: UpdateStudioDto;
}): Promise<Studio> {
  const response = await apiClient.patch<Studio>(`/admin/studios/${id}`, data);
  return response.data;
}

export function useUpdateStudio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStudio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studios'] });
    },
  });
}
