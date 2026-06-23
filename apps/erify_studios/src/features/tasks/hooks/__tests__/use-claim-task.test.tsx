import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClaimTask } from '../use-claim-task';

import { apiClient } from '@/lib/api/client';

const invalidateQueriesMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: invalidateQueriesMock,
    }),
  };
});

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    patch: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useClaimTask', () => {
  const mockedPatch = vi.mocked(apiClient.patch);

  beforeEach(() => {
    mockedPatch.mockReset();
    mockedPatch.mockResolvedValue({ data: { id: 'task_gate1' } });
    invalidateQueriesMock.mockReset();
  });

  it('claims a studio-scoped gate task and invalidates task queues', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useClaimTask({ studioId: 'studio_1' }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ taskId: 'task_gate1' });
    });

    expect(mockedPatch).toHaveBeenCalledWith('/studios/studio_1/tasks/task_gate1/claim');
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['studio-tasks', 'studio_1'] });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['my-tasks'] });
  });
});
