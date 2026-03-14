import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { getTaskTemplate, type GetTaskTemplateResponse } from '@/features/task-templates/api/get-task-template';
import { taskTemplateQueryKeys } from '@/features/task-templates/api/task-template-query-keys';

type UseTaskTemplateOptions = Omit<UseQueryOptions<
  GetTaskTemplateResponse,
  Error,
  GetTaskTemplateResponse
>, 'queryKey' | 'queryFn'>;

type UseTaskTemplateProps = UseTaskTemplateOptions & {
  studioId: string;
  templateId: string;
};

export function useTaskTemplate({
  studioId,
  templateId,
  ...props
}: UseTaskTemplateProps) {
  return useQuery({
    queryKey: taskTemplateQueryKeys.detail(studioId, templateId),
    queryFn: () => getTaskTemplate(studioId, templateId),
    enabled: !!studioId && !!templateId,
    ...props,
  });
}
