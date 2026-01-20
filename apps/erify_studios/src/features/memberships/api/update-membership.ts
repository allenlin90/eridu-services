import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import type { updateMembershipInputSchema } from '@eridu/api-types/memberships';

import type { Membership } from './get-memberships';

import { apiClient } from '@/lib/api/client';

export type UpdateMembershipDto = z.infer<typeof updateMembershipInputSchema>;

export async function updateMembership({ id, data }: { id: string; data: UpdateMembershipDto }): Promise<Membership> {
  const response = await apiClient.patch<Membership>(`/admin/studio-memberships/${id}`, data);
  return response.data;
}

export function useUpdateMembership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMembership,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
}
