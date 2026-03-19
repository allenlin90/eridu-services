import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateSharedFieldInput, UpdateSharedFieldInput } from '@eridu/api-types/task-management';

import { createStudioSharedField } from '../api/create-studio-shared-field';
import { studioSharedFieldsKeys } from '../api/keys';
import { updateStudioSharedField } from '../api/update-studio-shared-field';

type UseSharedFieldMutationsParams = {
  studioId: string;
};

export function useSharedFieldMutations({ studioId }: UseSharedFieldMutationsParams) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateSharedFieldInput) => createStudioSharedField(studioId, payload),
    onSuccess: (response) => {
      queryClient.setQueryData(studioSharedFieldsKeys.detail(studioId), response);
      void queryClient.invalidateQueries({ queryKey: studioSharedFieldsKeys.all(studioId) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ fieldKey, payload }: { fieldKey: string; payload: UpdateSharedFieldInput }) =>
      updateStudioSharedField(studioId, fieldKey, payload),
    onSuccess: (response) => {
      queryClient.setQueryData(studioSharedFieldsKeys.detail(studioId), response);
      void queryClient.invalidateQueries({ queryKey: studioSharedFieldsKeys.all(studioId) });
    },
  });

  return {
    createMutation,
    updateMutation,
  };
}
