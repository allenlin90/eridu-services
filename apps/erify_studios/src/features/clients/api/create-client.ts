import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { createClientInputSchema } from '@eridu/api-types/clients';

import type { Client } from './get-clients';

import { apiClient } from '@/lib/api/client';

export type CreateClientDto = z.infer<typeof createClientInputSchema>;

export async function createClient(data: CreateClientDto): Promise<Client> {
  const response = await apiClient.post<Client>('/admin/clients', data);
  return response.data;
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
