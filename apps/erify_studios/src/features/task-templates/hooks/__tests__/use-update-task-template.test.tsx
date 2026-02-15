import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useUpdateTaskTemplate } from '@/features/task-templates/hooks/use-update-task-template';

// Mock the hooks from TanStack Query
const mockUseMutation = vi.fn();
const mockResetQueries = vi.fn();
const mockUseQueryClient = vi.fn(() => ({
  resetQueries: mockResetQueries,
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: any) => mockUseMutation(options),
  useQueryClient: () => mockUseQueryClient(),
}));

// Mock the API function
vi.mock('@/features/task-templates/api/update-task-template', () => ({
  updateTaskTemplate: vi.fn(),
}));

describe('useUpdateTaskTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call updateTaskTemplate and invalidate queries on success', () => {
    const mockMutate = vi.fn();
    const mockMutateAsync = vi.fn();

    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: true,
      isError: false,
    });

    const { result } = renderHook(() =>
      useUpdateTaskTemplate({ studioId: 's1', templateId: 't1' }),
    );

    expect(result.current.mutate).toBe(mockMutate);
    expect(result.current.mutateAsync).toBe(mockMutateAsync);
    expect(result.current.isSuccess).toBe(true);

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

    // Verify resetQueries was called for both query keys
    expect(mockResetQueries).toHaveBeenCalledWith({
      queryKey: ['task-template', 's1', 't1'],
    });
    expect(mockResetQueries).toHaveBeenCalledWith({
      queryKey: ['task-templates', 's1'],
    });
  });
});
