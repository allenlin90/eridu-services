import { apiClient } from '@/lib/api/client';

export async function deleteTaskTemplate(
  studioId: string,
  templateId: string,
): Promise<void> {
  await apiClient.delete(`/studios/${studioId}/task-templates/${templateId}`);
}
