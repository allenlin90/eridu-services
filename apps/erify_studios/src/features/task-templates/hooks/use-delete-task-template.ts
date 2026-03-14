import type { InfiniteData, UseMutationOptions } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteTaskTemplate } from '../api/delete-task-template';
import type { GetTaskTemplatesResponse } from '../api/get-task-templates';
import { taskTemplateQueryKeys } from '../api/task-template-query-keys';

import { removeTaskTemplateFromInfinitePages } from './task-template-cache-utils';

type UseDeleteTaskTemplateOptions = UseMutationOptions<void, Error, string>;

type UseDeleteTaskTemplateProps = UseDeleteTaskTemplateOptions & {
  studioId: string;
};

export function useDeleteTaskTemplate({
  studioId,
  onSuccess,
  ...props
}: UseDeleteTaskTemplateProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteTaskTemplate(studioId, templateId),
    onSuccess: (_result, deletedTemplateId, ...args) => {
      queryClient.removeQueries({
        queryKey: taskTemplateQueryKeys.detail(studioId, deletedTemplateId),
      });

      queryClient.setQueriesData<InfiniteData<GetTaskTemplatesResponse>>(
        {
          queryKey: taskTemplateQueryKeys.listPrefix(studioId),
          type: 'active',
        },
        (current) => removeTaskTemplateFromInfinitePages(current, deletedTemplateId),
      );

      queryClient.setQueriesData<InfiniteData<GetTaskTemplatesResponse>>(
        {
          queryKey: taskTemplateQueryKeys.allPickerPrefix(studioId),
          type: 'active',
        },
        (current) => removeTaskTemplateFromInfinitePages(current, deletedTemplateId),
      );

      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.listPrefix(studioId),
        type: 'inactive',
      });
      void queryClient.invalidateQueries({
        queryKey: taskTemplateQueryKeys.allPickerPrefix(studioId),
        type: 'inactive',
      });

      onSuccess?.(_result, deletedTemplateId, ...args);
    },
    ...props,
  });
}
