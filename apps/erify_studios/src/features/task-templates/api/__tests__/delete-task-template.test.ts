import { describe, expect, it, vi } from 'vitest';

import { deleteTaskTemplate } from '../delete-task-template';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    delete: vi.fn(),
  },
}));

describe('deleteTaskTemplate', () => {
  it('should call apiClient.delete with correct URL', async () => {
    (apiClient.delete as any).mockResolvedValue({ data: {} });

    await deleteTaskTemplate('studio-1', 'template-1');

    expect(apiClient.delete).toHaveBeenCalledWith('/studios/studio-1/task-templates/template-1');
  });
});
