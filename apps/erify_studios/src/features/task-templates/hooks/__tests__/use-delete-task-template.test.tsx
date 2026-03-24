import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDeleteTaskTemplate } from '../use-delete-task-template';

const mockUseMutation = vi.fn();
const mockRemoveQueries = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: any) => mockUseMutation(options),
  useQueryClient: () => ({
    removeQueries: mockRemoveQueries,
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock('../api/delete-task-template', () => ({
  deleteTaskTemplate: vi.fn(),
}));

describe('useDeleteTaskTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  it('removes detail cache and invalidates list prefixes', () => {
    const mockMutate = vi.fn();

    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    const { result } = renderHook(() =>
      useDeleteTaskTemplate({ studioId: 's1' }),
    );

    expect(result.current.mutate).toBe(mockMutate);
    expect(mockUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationFn: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );

    const mutationOptions = mockUseMutation.mock.calls[0][0];
    mutationOptions.onSuccess(undefined, 'ttpl_1');

    expect(mockRemoveQueries).toHaveBeenCalledWith({
      queryKey: ['task-templates', 'detail', 's1', 'ttpl_1'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['task-templates', 'list', 's1'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['task-templates', 'list', 's1', 'all-picker'],
    });
  });
});
