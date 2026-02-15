import type { TaskTemplateDto } from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export type GetTaskTemplateResponse = TaskTemplateDto;

export async function getTaskTemplate(
  studioId: string,
  templateId: string,
): Promise<GetTaskTemplateResponse> {
  const response = await apiClient.get<GetTaskTemplateResponse>(
    `/studios/${studioId}/task-templates/${templateId}`,
  );
  return response.data;
}
