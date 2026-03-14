import type { InfiniteData, UseMutationOptions } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UpdateStudioTaskTemplateInput } from '@eridu/api-types/task-management';

import { upsertTaskTemplateInInfinitePages } from './task-template-cache-utils';

import type { GetTaskTemplatesResponse } from '@/features/task-templates/api/get-task-templates';
import { taskTemplateQueryKeys } from '@/features/task-templates/api/task-template-query-keys';
import {
  updateTaskTemplate,
  type UpdateTaskTemplateResponse,
} from '@/features/task-templates/api/update-task-template';

type UseUpdateTaskTemplateOptions = UseMutationOptions<
  UpdateTaskTemplateResponse,
  Error,
  UpdateStudioTaskTemplateInput
>;

type UseUpdateTaskTemplateProps = UseUpdateTaskTemplateOptions & {
  studioId: string;
  templateId: string;
};

export function useUpdateTaskTemplate({
  studioId,
  templateId,
  onSuccess,
  ...props
}: UseUpdateTaskTemplateProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStudioTaskTemplateInput) =>
      updateTaskTemplate(studioId, templateId, data),
    onSuccess: (updatedTemplate, ...args) => {
      queryClient.setQueryData(
        taskTemplateQueryKeys.detail(studioId, templateId),
        updatedTemplate,
      );

      queryClient.setQueriesData<InfiniteData<GetTaskTemplatesResponse>>(
        {
          queryKey: taskTemplateQueryKeys.listPrefix(studioId),
          type: 'active',
        },
        (current) => upsertTaskTemplateInInfinitePages(current, updatedTemplate),
      );

      queryClient.setQueriesData<InfiniteData<GetTaskTemplatesResponse>>(
        {
          queryKey: taskTemplateQueryKeys.allPickerPrefix(studioId),
          type: 'active',
        },
        (current) => upsertTaskTemplateInInfinitePages(current, updatedTemplate),
      );

      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.listPrefix(studioId),
        type: 'inactive',
      });
      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.allPickerPrefix(studioId),
        type: 'inactive',
      });

      onSuccess?.(updatedTemplate, ...args);
    },
    ...props,
  });
}
