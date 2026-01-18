import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateUserInputSchema } from '@eridu/api-types/users';

import type { User } from './get-users';

import { apiClient } from '@/lib/api/client';

export type UpdateUserDto = z.infer<typeof updateUserInputSchema>;

export async function updateUser({ id, data }: { id: string; data: UpdateUserDto }): Promise<User> {
  const response = await apiClient.patch<User>(`/admin/users/${id}`, data);
  return response.data;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
