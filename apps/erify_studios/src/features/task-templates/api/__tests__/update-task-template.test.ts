import { describe, expect, it, vi } from 'vitest';

import { updateTaskTemplate } from '../update-task-template';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    patch: vi.fn(),
  },
}));

describe('updateTaskTemplate', () => {
  it('should call apiClient.patch with correct URL and data', async () => {
    const mockData = { id: 'template-1', name: 'Updated name' };
    const payload = { name: 'Updated name', version: 1 };
    (apiClient.patch as any).mockResolvedValue({ data: mockData });

    const result = await updateTaskTemplate('studio-1', 'template-1', payload);

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/studios/studio-1/task-templates/template-1',
      payload,
    );
    expect(result).toEqual(mockData);
  });
});
