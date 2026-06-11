import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ClientMechanic } from './get-client-mechanics';

import { apiClient } from '@/lib/api/client';

export async function deleteClientMechanic(
  studioId: string,
  clientId: string,
  mechanicId: string,
): Promise<ClientMechanic> {
  const response = await apiClient.delete<ClientMechanic>(
    `/studios/${studioId}/clients/${clientId}/mechanics/${mechanicId}`,
  );
  return response.data;
}

export function useDeleteClientMechanic(studioId: string, clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mechanicId: string) =>
      deleteClientMechanic(studioId, clientId, mechanicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['client-mechanics', 'list', studioId, clientId],
      });
    },
  });
}
