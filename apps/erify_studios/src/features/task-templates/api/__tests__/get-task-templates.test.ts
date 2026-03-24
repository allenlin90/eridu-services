import { describe, expect, it, vi } from 'vitest';

import { getTaskTemplates } from '../get-task-templates';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('getTaskTemplates', () => {
  it('passes pagination and moderation-aware filters to the studio endpoint', async () => {
    (apiClient.get as any).mockResolvedValue({ data: { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } } });

    await getTaskTemplates('std_123', {
      page: 1,
      limit: 10,
      name: 'moderation',
      template_kind: 'moderation',
      task_type: 'ACTIVE',
      is_active: true,
      sort: 'updated_at:desc',
    });

    expect(apiClient.get).toHaveBeenCalledWith('/studios/std_123/task-templates', {
      params: {
        page: 1,
        limit: 10,
        name: 'moderation',
        task_type: 'ACTIVE',
        template_kind: 'moderation',
        is_active: true,
        sort: 'updated_at:desc',
      },
      signal: undefined,
    });
  });
});
