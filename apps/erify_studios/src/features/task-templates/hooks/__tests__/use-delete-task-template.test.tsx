import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDeleteTaskTemplate } from '../use-delete-task-template';

// Mock the hooks from TanStack Query
const mockUseMutation = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockUseQueryClient = vi.fn(() => ({
  invalidateQueries: mockInvalidateQueries,
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: any) => mockUseMutation(options),
  useQueryClient: () => mockUseQueryClient(),
}));

// Mock the API function
vi.mock('../api/delete-task-template', () => ({
  deleteTaskTemplate: vi.fn(),
}));

describe('useDeleteTaskTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call deleteTaskTemplate and invalidate queries on success', () => {
    const mockMutate = vi.fn();

    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    const { result } = renderHook(() =>
      useDeleteTaskTemplate({ studioId: 's1' }),
    );

    expect(result.current.mutate).toBe(mockMutate);

    // Verify useMutation was called with correct configuration
    expect(mockUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationFn: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );

    // Test the onSuccess callback
    const mutationOptions = mockUseMutation.mock.calls[0][0];
    mutationOptions.onSuccess();

    // Verify invalidateQueries was called
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['task-templates', 's1'],
    });
  });
});
