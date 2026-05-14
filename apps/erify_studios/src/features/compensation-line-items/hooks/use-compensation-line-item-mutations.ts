import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  CreateAdminCompensationLineItemInput,
  CreateStudioCompensationLineItemInput,
  UpdateCompensationLineItemInput,
} from '@eridu/api-types/compensation-line-items';

import {
  adminCompensationLineItemKeys,
  createAdminCompensationLineItem,
  createStudioCompensationLineItem,
  deleteAdminCompensationLineItem,
  deleteStudioCompensationLineItem,
  studioCompensationLineItemKeys,
  updateAdminCompensationLineItem,
  updateStudioCompensationLineItem,
} from '@/features/compensation-line-items/api/compensation-line-items.api';
import { showCreatorsKeys } from '@/features/studio-show-creators/api/get-show-creators';

export function useCreateAdminCompensationLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminCompensationLineItemInput) =>
      createAdminCompensationLineItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCompensationLineItemKeys.all });
    },
  });
}

export function useUpdateAdminCompensationLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompensationLineItemInput }) =>
      updateAdminCompensationLineItem(id, data),
    onSuccess: (updatedLineItem) => {
      queryClient.invalidateQueries({ queryKey: adminCompensationLineItemKeys.all });
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
      queryClient.invalidateQueries({ queryKey: adminCompensationLineItemKeys.all });
      queryClient.removeQueries({ queryKey: adminCompensationLineItemKeys.detail(id) });
    },
  });
}

type StudioMutationContext = {
  studioId: string;
  showId?: string;
};

function invalidateStudioCompensationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  { studioId, showId }: StudioMutationContext,
) {
  queryClient.invalidateQueries({
    queryKey: studioCompensationLineItemKeys.listPrefix(studioId),
  });
  if (showId) {
    queryClient.invalidateQueries({
      queryKey: showCreatorsKeys.compensationSummary(studioId, showId),
    });
  }
}

export function useCreateStudioCompensationLineItem(context: StudioMutationContext) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStudioCompensationLineItemInput) =>
      createStudioCompensationLineItem(context.studioId, data),
    onSuccess: () => {
      invalidateStudioCompensationQueries(queryClient, context);
    },
  });
}

export function useUpdateStudioCompensationLineItem(context: StudioMutationContext) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompensationLineItemInput }) =>
      updateStudioCompensationLineItem(context.studioId, id, data),
    onSuccess: (updatedLineItem) => {
      invalidateStudioCompensationQueries(queryClient, context);
      queryClient.invalidateQueries({
        queryKey: studioCompensationLineItemKeys.detail(context.studioId, updatedLineItem.id),
      });
    },
  });
}

export function useDeleteStudioCompensationLineItem(context: StudioMutationContext) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteStudioCompensationLineItem(context.studioId, id),
    onSuccess: (_result, id) => {
      invalidateStudioCompensationQueries(queryClient, context);
      queryClient.removeQueries({
        queryKey: studioCompensationLineItemKeys.detail(context.studioId, id),
      });
    },
  });
}
