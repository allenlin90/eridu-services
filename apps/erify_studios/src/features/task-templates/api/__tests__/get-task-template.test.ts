import { describe, expect, it, vi } from 'vitest';

import { getTaskTemplate } from '../get-task-template';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('getTaskTemplate', () => {
  it('should call apiClient.get with correct URL', async () => {
    const mockData = { id: 'template-1', name: 'Test Template' };
    (apiClient.get as any).mockResolvedValue({ data: mockData });

    const result = await getTaskTemplate('studio-1', 'template-1');

    expect(apiClient.get).toHaveBeenCalledWith('/studios/studio-1/task-templates/template-1');
    expect(result).toEqual(mockData);
  });
});
