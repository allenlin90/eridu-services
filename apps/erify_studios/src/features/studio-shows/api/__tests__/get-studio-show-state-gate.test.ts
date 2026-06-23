import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getStudioShowStateGate } from '../get-studio-show-state-gate';

import { apiClient } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('getStudioShowStateGate', () => {
  const mockedGet = vi.mocked(apiClient.get);

  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('fetches the open state gate for a studio show and forwards the abort signal', async () => {
    const controller = new AbortController();
    mockedGet.mockResolvedValue({
      data: {
        id: 'task_gate1',
        gate_kind: 'show_cancellation',
        history: [],
      },
    });

    const result = await getStudioShowStateGate(
      'studio_1',
      'show_1',
      { signal: controller.signal },
    );

    expect(result).toEqual({
      id: 'task_gate1',
      gate_kind: 'show_cancellation',
      history: [],
    });
    expect(mockedGet).toHaveBeenCalledWith(
      '/studios/studio_1/shows/show_1/state-gate',
      { signal: controller.signal },
    );
  });
});
