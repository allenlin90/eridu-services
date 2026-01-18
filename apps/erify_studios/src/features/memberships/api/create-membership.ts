import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { createMembershipInputSchema } from '@eridu/api-types/memberships';

import type { Membership } from './get-memberships';

import { apiClient } from '@/lib/api/client';

export type CreateMembershipDto = z.infer<typeof createMembershipInputSchema>;

export async function createMembership(data: CreateMembershipDto): Promise<Membership> {
  const response = await apiClient.post<Membership>('/admin/studio-memberships', data);
  return response.data;
}

export function useCreateMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMembership,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
}
