import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTaskTemplate } from '@/features/task-templates/hooks/use-task-template';

// Mock the useQuery hook from TanStack Query
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => mockUseQuery(options),
}));

// Mock the API function
vi.mock('@/features/task-templates/api/get-task-template', () => ({
  getTaskTemplate: vi.fn(),
}));

describe('useTaskTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch task template', () => {
    const mockData = { id: 't1', name: 'Template 1' };
    mockUseQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      isSuccess: true,
      isError: false,
    });

    const { result } = renderHook(() =>
      useTaskTemplate({ studioId: 's1', templateId: 't1' }),
    );

    expect(result.current.data).toEqual(mockData);
    expect(result.current.isSuccess).toBe(true);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['task-template', 's1', 't1'],
        enabled: true,
      }),
    );
  });

  it('should not fetch when ids are missing', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
      fetchStatus: 'idle',
    });

    const { result } = renderHook(() =>
      useTaskTemplate({ studioId: '', templateId: '' }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['task-template', '', ''],
        enabled: false,
      }),
    );
  });
});
