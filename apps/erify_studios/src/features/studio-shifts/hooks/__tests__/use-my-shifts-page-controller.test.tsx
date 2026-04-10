import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMyShiftsPageController } from '../use-my-shifts-page-controller';

const mockUseMyShifts = vi.fn();
const mockOnPaginationChange = vi.fn();
const mockSetPageCount = vi.fn();

vi.mock('@eridu/ui', () => ({
  useTableUrlState: vi.fn(() => ({
    pagination: { pageIndex: 2, pageSize: 20 },
    onPaginationChange: mockOnPaginationChange,
    setPageCount: mockSetPageCount,
  })),
}));

vi.mock('@/features/studio-shifts/hooks/use-studio-shifts', () => ({
  useMyShifts: (...args: unknown[]) => mockUseMyShifts(...args),
}));

describe('useMyShiftsPageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseMyShifts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: true,
      refetch: vi.fn(),
    });
  });

  it('derives query pagination from the shared table url state', () => {
    renderHook(() => useMyShiftsPageController({
      studioId: 'std_1',
      search: {
        view: 'table',
        page: 1,
        limit: 10,
        status: 'SCHEDULED',
      },
    }));

    expect(mockUseMyShifts).toHaveBeenCalledWith({
      page: 3,
      limit: 20,
      studio_id: 'std_1',
      date_from: expect.any(String),
      date_to: expect.any(String),
      status: 'SCHEDULED',
    }, {
      enabled: true,
    });
  });

  it('uses fallback pagination until API metadata arrives', () => {
    const { result } = renderHook(() => useMyShiftsPageController({
      studioId: 'std_1',
      search: {
        view: 'table',
        page: 1,
        limit: 10,
      },
    }));

    expect(mockSetPageCount).not.toHaveBeenCalled();
    expect(result.current.pagination).toEqual({
      pageIndex: 2,
      pageSize: 20,
      total: 0,
      pageCount: 0,
    });
  });

  it('uses API pagination metadata once it is available', () => {
    mockUseMyShifts.mockReturnValue({
      data: {
        data: [],
        meta: {
          page: 2,
          limit: 20,
          total: 21,
          totalPages: 2,
        },
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useMyShiftsPageController({
      studioId: 'std_1',
      search: {
        view: 'table',
        page: 1,
        limit: 10,
      },
    }));

    expect(mockSetPageCount).toHaveBeenCalledWith(2);
    expect(result.current.pagination).toEqual({
      pageIndex: 1,
      pageSize: 20,
      total: 21,
      pageCount: 2,
    });
    expect(result.current.onPaginationChange).toBe(mockOnPaginationChange);
  });
});
