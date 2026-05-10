import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  CreateAdminCompensationLineItemInput,
  UpdateCompensationLineItemInput,
} from '@eridu/api-types/compensation-line-items';

import {
  adminCompensationLineItemKeys,
  createAdminCompensationLineItem,
  deleteAdminCompensationLineItem,
  updateAdminCompensationLineItem,
} from '@/features/compensation-line-items/api/compensation-line-items.api';

export function useCreateAdminCompensationLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminCompensationLineItemInput) =>
      createAdminCompensationLineItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCompensationLineItemKeys.lists() });
    },
  });
}

export function useUpdateAdminCompensationLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompensationLineItemInput }) =>
      updateAdminCompensationLineItem(id, data),
    onSuccess: (updatedLineItem) => {
      queryClient.invalidateQueries({ queryKey: adminCompensationLineItemKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: adminCompensationLineItemKeys.detail(updatedLineItem.id),
      });
    },
  });
}

export function useDeleteAdminCompensationLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAdminCompensationLineItem(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: adminCompensationLineItemKeys.lists() });
      queryClient.removeQueries({ queryKey: adminCompensationLineItemKeys.detail(id) });
    },
  });
}
