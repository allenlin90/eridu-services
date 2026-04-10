import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMyShiftsPageController } from '../use-my-shifts-page-controller';

const mockUseMyShifts = vi.fn();

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

  it('preserves the requested page when pagination metadata is still loading', () => {
    const { result } = renderHook(() => useMyShiftsPageController({
      studioId: 'std_1',
      search: {
        view: 'table',
        page: 3,
        limit: 20,
      },
    }));

    expect(result.current.totalPages).toBeUndefined();
    expect(result.current.resolvedTotalPages).toBe(3);
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
        page: 3,
        limit: 20,
      },
    }));

    expect(result.current.totalPages).toBe(2);
    expect(result.current.resolvedTotalPages).toBe(2);
  });
});
