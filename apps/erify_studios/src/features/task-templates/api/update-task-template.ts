import type {
  TaskTemplateDto,
  UpdateStudioTaskTemplateInput,
} from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export type UpdateTaskTemplateResponse = TaskTemplateDto;

export async function updateTaskTemplate(
  studioId: string,
  templateId: string,
  data: UpdateStudioTaskTemplateInput,
): Promise<UpdateTaskTemplateResponse> {
  const response = await apiClient.patch<UpdateTaskTemplateResponse>(
    `/studios/${studioId}/task-templates/${templateId}`,
    data,
  );
  return response.data;
}
