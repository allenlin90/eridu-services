import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBulkAssignCreatorsToShows } from '../bulk-assign-creators-to-shows';
import { useBulkAssignShowCreators } from '../bulk-assign-show-creators';
import { useRemoveShowCreator } from '../remove-show-creator';

const mocks = vi.hoisted(() => ({
  useMutation: vi.fn(),
  invalidateQueries: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useMutation: (options: unknown) => mocks.useMutation(options),
    useQueryClient: () => ({
      invalidateQueries: mocks.invalidateQueries,
    }),
  };
});

vi.mock('sonner', () => ({
  toast: {
    info: mocks.toastInfo,
    success: mocks.toastSuccess,
    warning: mocks.toastWarning,
  },
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    delete: vi.fn(),
    post: vi.fn(),
  },
}));

type MutationOptions<TResponse = unknown, TVariables = unknown> = {
  onSuccess: (response: TResponse, variables: TVariables) => Promise<void>;
};

function setupMutationMock() {
  mocks.useMutation.mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  });
}

describe('show creator mutation cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMutationMock();
  });

  it('invalidates the compensation summary after removing a show creator', async () => {
    renderHook(() => useRemoveShowCreator('std_1', 'show_1'));

    const mutationOptions = mocks.useMutation.mock.calls[0][0] as MutationOptions;
    await mutationOptions.onSuccess(undefined, undefined);

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['show-creators', 'compensation-summary', 'std_1', 'show_1'],
    });
  });

  it('invalidates the compensation summary after assigning creators to one show', async () => {
    renderHook(() => useBulkAssignShowCreators('std_1', 'show_1'));

    const mutationOptions = mocks.useMutation.mock.calls[0][0] as MutationOptions;
    await mutationOptions.onSuccess(undefined, undefined);

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['show-creators', 'compensation-summary', 'std_1', 'show_1'],
    });
  });

  it('invalidates each selected show compensation summary after bulk show assignment', async () => {
    renderHook(() => useBulkAssignCreatorsToShows({ studioId: 'std_1' }));

    const mutationOptions = mocks.useMutation.mock.calls[0][0] as MutationOptions<
      { created: number; skipped: number; errors: [] },
      { show_ids: string[]; creators: [{ creator_id: string }] }
    >;
    await mutationOptions.onSuccess(
      { created: 2, skipped: 0, errors: [] },
      {
        show_ids: ['show_1', 'show_2', 'show_1'],
        creators: [{ creator_id: 'creator_1' }],
      },
    );

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['show-creators', 'compensation-summary', 'std_1', 'show_1'],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['show-creators', 'compensation-summary', 'std_1', 'show_2'],
    });
  });
});
