import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Platform } from './get-platforms';

import { apiClient } from '@/lib/api/client';

export type UpdatePlatformDto = {
  name?: string;
  logo_url?: string;
};

export async function updatePlatform({ id, data }: { id: string; data: UpdatePlatformDto }): Promise<Platform> {
  const response = await apiClient.patch<Platform>(`/admin/platforms/${id}`, data);
  return response.data;
}

export function useUpdatePlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
    },
  });
}
