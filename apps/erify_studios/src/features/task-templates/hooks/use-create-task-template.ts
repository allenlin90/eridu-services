import { useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query';

import type { CreateStudioTaskTemplateInput } from '@eridu/api-types/task-management';

import {
  createTaskTemplate,
  type CreateTaskTemplateResponse,
} from '../api/create-task-template';
import { taskTemplateQueryKeys } from '../api/task-template-query-keys';

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
    onSuccess: (createdTemplate, ...args) => {
      queryClient.setQueryData(
        taskTemplateQueryKeys.detail(studioId, createdTemplate.id),
        createdTemplate,
      );

      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.listPrefix(studioId),
      });
      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.allPickerPrefix(studioId),
      });

      onSuccess?.(createdTemplate, ...args);
    },
    ...props,
  });
}
