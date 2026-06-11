import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UpdateClientMechanicInput } from '@eridu/api-types/client-mechanics';

import type { ClientMechanic } from './get-client-mechanics';

import { apiClient } from '@/lib/api/client';

type UpdateParams = {
  mechanicId: string;
  data: UpdateClientMechanicInput;
};

export async function updateClientMechanic(
  studioId: string,
  clientId: string,
  mechanicId: string,
  data: UpdateClientMechanicInput,
): Promise<ClientMechanic> {
  const response = await apiClient.patch<ClientMechanic>(
    `/studios/${studioId}/clients/${clientId}/mechanics/${mechanicId}`,
    data,
  );
  return response.data;
}

export function useUpdateClientMechanic(studioId: string, clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mechanicId, data }: UpdateParams) =>
      updateClientMechanic(studioId, clientId, mechanicId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['client-mechanics', 'list', studioId, clientId],
      });
    },
  });
}
