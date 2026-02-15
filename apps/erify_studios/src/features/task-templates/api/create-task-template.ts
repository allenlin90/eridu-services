import type {
  CreateStudioTaskTemplateInput,
  TaskTemplateDto,
} from '@eridu/api-types/task-management';

import { apiClient } from '@/lib/api/client';

export type CreateTaskTemplateResponse = TaskTemplateDto;

export async function createTaskTemplate(
  studioId: string,
  data: CreateStudioTaskTemplateInput,
): Promise<CreateTaskTemplateResponse> {
  const response = await apiClient.post<CreateTaskTemplateResponse>(
    `/studios/${studioId}/task-templates`,
    data,
  );
  return response.data;
}
