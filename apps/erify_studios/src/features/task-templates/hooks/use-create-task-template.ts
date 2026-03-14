import { type InfiniteData, useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query';

import type { CreateStudioTaskTemplateInput } from '@eridu/api-types/task-management';

import {
  createTaskTemplate,
  type CreateTaskTemplateResponse,
} from '../api/create-task-template';
import type { GetTaskTemplatesResponse } from '../api/get-task-templates';
import { taskTemplateQueryKeys } from '../api/task-template-query-keys';

import { upsertTaskTemplateInInfinitePages } from './task-template-cache-utils';

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

      queryClient.setQueriesData<InfiniteData<GetTaskTemplatesResponse>>(
        {
          queryKey: taskTemplateQueryKeys.listPrefix(studioId),
          type: 'active',
        },
        // Keep active list UIs responsive without forcing an immediate full revalidation.
        (current) => upsertTaskTemplateInInfinitePages(current, createdTemplate),
      );

      queryClient.setQueriesData<InfiniteData<GetTaskTemplatesResponse>>(
        {
          queryKey: taskTemplateQueryKeys.allPickerPrefix(studioId),
          type: 'active',
        },
        (current) => upsertTaskTemplateInInfinitePages(current, createdTemplate),
      );

      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.listPrefix(studioId),
        type: 'inactive',
      });
      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.allPickerPrefix(studioId),
        type: 'inactive',
      });

      onSuccess?.(createdTemplate, ...args);
    },
    ...props,
  });
}
