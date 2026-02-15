import { useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query';

import type { CreateStudioTaskTemplateInput } from '@eridu/api-types/task-management';

import {
  createTaskTemplate,
  type CreateTaskTemplateResponse,
} from '../api/create-task-template';

type UseCreateTaskTemplateOptions = UseMutationOptions<
  CreateTaskTemplateResponse,
  Error,
  CreateStudioTaskTemplateInput
>;

type UseCreateTaskTemplateProps = UseCreateTaskTemplateOptions & {
  studioId: string;
};

export function useCreateTaskTemplate({
  studioId,
  onSuccess,
  ...props
}: UseCreateTaskTemplateProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStudioTaskTemplateInput) =>
      createTaskTemplate(studioId, data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: ['task-templates', studioId],
      });
      onSuccess?.(...args);
    },
    ...props,
  });
}
