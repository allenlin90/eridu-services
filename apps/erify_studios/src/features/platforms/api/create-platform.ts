import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Platform } from './get-platforms';

import { apiClient } from '@/lib/api/client';

export type CreatePlatformDto = {
  name: string;
  logo_url?: string;
};

export async function createPlatform(data: CreatePlatformDto): Promise<Platform> {
  const response = await apiClient.post<Platform>('/admin/platforms', data);
  return response.data;
}

export function useCreatePlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
    },
  });
}
