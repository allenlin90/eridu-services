import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateClientInputSchema } from '@eridu/api-types/clients';

import type { Client } from './get-clients';

import { apiClient } from '@/lib/api/client';

export type UpdateClientDto = z.infer<typeof updateClientInputSchema>;

export async function updateClient({
  id,
  data,
}: {
  id: string;
  data: UpdateClientDto;
}): Promise<Client> {
  const response = await apiClient.patch<Client>(`/admin/clients/${id}`, data);
  return response.data;
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
