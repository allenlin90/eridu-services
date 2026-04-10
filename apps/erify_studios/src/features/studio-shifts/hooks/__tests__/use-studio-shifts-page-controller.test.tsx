import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStudioShiftsPageController } from '../use-studio-shifts-page-controller';

const mockUseStudioShifts = vi.fn();
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
  useStudioShifts: (...args: unknown[]) => mockUseStudioShifts(...args),
}));

function createShift(id: string, startIso: string) {
  return {
    id,
    studio_id: 'std_1',
    user_id: 'user_1',
    user_name: id,
    date: '2026-03-05',
    hourly_rate: '20.00',
    projected_cost: '60.00',
    calculated_cost: null,
    is_approved: false,
    is_duty_manager: false,
    status: 'SCHEDULED' as const,
    metadata: {},
    blocks: [
      {
        id: `${id}_block`,
        start_time: startIso,
        end_time: '2026-03-05T12:00:00.000Z',
        metadata: {},
        created_at: '2026-03-05T00:00:00.000Z',
        updated_at: '2026-03-05T00:00:00.000Z',
      },
    ],
    created_at: '2026-03-05T00:00:00.000Z',
    updated_at: '2026-03-05T00:00:00.000Z',
  };
}

describe('useStudioShiftsPageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseStudioShifts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: true,
      refetch: vi.fn(),
    });
  });

  it('derives query pagination from the shared table url state', () => {
    renderHook(() => useStudioShiftsPageController({
      studioId: 'std_1',
      search: {
        view: 'table',
        page: 1,
        limit: 10,
        status: 'SCHEDULED',
      },
      enabled: true,
    }));

    expect(mockUseStudioShifts).toHaveBeenCalledWith('std_1', {
      page: 3,
      limit: 20,
      status: 'SCHEDULED',
    }, {
      enabled: true,
    });
  });

  it('syncs page count and returns sorted shifts from the API response', () => {
    mockUseStudioShifts.mockReturnValue({
      data: {
        data: [
          createShift('ssh_late', '2026-03-05T11:00:00.000Z'),
          createShift('ssh_early', '2026-03-05T09:00:00.000Z'),
        ],
        meta: {
          page: 3,
          limit: 20,
          total: 53,
          totalPages: 3,
        },
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useStudioShiftsPageController({
      studioId: 'std_1',
      search: {
        view: 'table',
        page: 1,
        limit: 10,
      },
      enabled: true,
    }));

    expect(mockSetPageCount).toHaveBeenCalledWith(3);
    expect(result.current.pagination).toEqual({
      pageIndex: 2,
      pageSize: 20,
      total: 53,
      pageCount: 3,
    });
    expect(result.current.shifts.map((shift) => shift.id)).toEqual(['ssh_early', 'ssh_late']);
    expect(result.current.onPaginationChange).toBe(mockOnPaginationChange);
  });
});
