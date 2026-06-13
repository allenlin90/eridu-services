import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateClientMechanicInput } from '@eridu/api-types/client-mechanics';

import type { ClientMechanic } from './get-client-mechanics';

import { apiClient } from '@/lib/api/client';

export async function createClientMechanic(
  studioId: string,
  clientId: string,
  data: CreateClientMechanicInput,
): Promise<ClientMechanic> {
  const response = await apiClient.post<ClientMechanic>(
    `/studios/${studioId}/clients/${clientId}/mechanics`,
    data,
  );
  return response.data;
}

export function useCreateClientMechanic(studioId: string, clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientMechanicInput) =>
      createClientMechanic(studioId, clientId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['client-mechanics', 'list', studioId, clientId],
      });
    },
  });
}
