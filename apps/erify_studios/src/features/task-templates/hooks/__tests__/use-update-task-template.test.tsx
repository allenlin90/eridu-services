import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useUpdateTaskTemplate } from '@/features/task-templates/hooks/use-update-task-template';

const mockUseMutation = vi.fn();
const mockSetQueryData = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: any) => mockUseMutation(options),
  useQueryClient: () => ({
    setQueryData: mockSetQueryData,
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock('@/features/task-templates/api/update-task-template', () => ({
  updateTaskTemplate: vi.fn(),
}));

describe('useUpdateTaskTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  it('updates detail cache and invalidates list prefixes on success', () => {
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

    expect(mockUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationFn: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );

    const mutationOptions = mockUseMutation.mock.calls[0][0];
    const updatedTemplate = {
      id: 't1',
      name: 'Updated template',
    };

    mutationOptions.onSuccess(updatedTemplate);

    expect(mockSetQueryData).toHaveBeenCalledWith(
      ['task-templates', 'detail', 's1', 't1'],
      updatedTemplate,
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['task-templates', 'list', 's1'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['task-templates', 'list', 's1', 'all-picker'],
    });
  });
});
