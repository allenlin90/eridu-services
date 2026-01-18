import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { createUserInputSchema } from '@eridu/api-types/users';

import type { User } from './get-users';

import { apiClient } from '@/lib/api/client';

export type CreateUserDto = z.infer<typeof createUserInputSchema>;

export async function createUser(data: CreateUserDto): Promise<User> {
  const response = await apiClient.post<User>('/admin/users', data);
  return response.data;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
