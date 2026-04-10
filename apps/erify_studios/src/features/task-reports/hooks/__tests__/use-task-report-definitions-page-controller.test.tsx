import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTaskReportDefinitionsPageController } from '../use-task-report-definitions-page-controller';

const mockUseTaskReportDefinitions = vi.fn();
const mockOnPaginationChange = vi.fn();
const mockSetPageCount = vi.fn();
const mockOnColumnFiltersChange = vi.fn();

vi.mock('@eridu/ui', () => ({
  useTableUrlState: vi.fn(() => ({
    pagination: { pageIndex: 1, pageSize: 10 },
    onPaginationChange: mockOnPaginationChange,
    setPageCount: mockSetPageCount,
    columnFilters: [{ id: 'search', value: 'weekly' }],
    onColumnFiltersChange: mockOnColumnFiltersChange,
  })),
}));

vi.mock('@/features/task-reports/hooks/use-task-report-definitions', () => ({
  useTaskReportDefinitions: (...args: unknown[]) => mockUseTaskReportDefinitions(...args),
}));

describe('useTaskReportDefinitionsPageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseTaskReportDefinitions.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('derives query pagination and search from shared table url state', () => {
    renderHook(() => useTaskReportDefinitionsPageController({
      studioId: 'std_1',
    }));

    expect(mockUseTaskReportDefinitions).toHaveBeenCalledWith({
      studioId: 'std_1',
      query: {
        page: 2,
        limit: 10,
        search: 'weekly',
      },
    });
  });

  it('syncs page count and exposes shared pagination controls', () => {
    mockUseTaskReportDefinitions.mockReturnValue({
      data: {
        data: [],
        meta: {
          page: 2,
          limit: 10,
          total: 12,
          totalPages: 2,
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useTaskReportDefinitionsPageController({
      studioId: 'std_1',
    }));

    expect(mockSetPageCount).toHaveBeenCalledWith(2);
    expect(result.current.pagination).toEqual({
      pageIndex: 1,
      pageSize: 10,
      total: 12,
      pageCount: 2,
    });
    expect(result.current.onPaginationChange).toBe(mockOnPaginationChange);
    expect(result.current.search).toBe('weekly');
  });

  it('resets the shared search filter through column filter updates', () => {
    const { result } = renderHook(() => useTaskReportDefinitionsPageController({
      studioId: 'std_1',
    }));

    result.current.onSearchChange(undefined);

    expect(mockOnColumnFiltersChange).toHaveBeenCalledWith(expect.any(Function));
    const updater = mockOnColumnFiltersChange.mock.calls[0][0] as (filters: Array<{ id: string; value: string }>) => unknown;
    expect(updater([{ id: 'search', value: 'weekly' }])).toEqual([]);
  });
});
