import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseSearch = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useSearch: () => mockUseSearch(),
    useNavigate: () => mockNavigate,
  }),
}));

// Must import after the mock is set up
const { useShowsTableState } = await import('../use-shows-table-state');

describe('useShowsTableState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockResolvedValue(undefined);
    mockUseSearch.mockReturnValue({
      page: 1,
      limit: 10,
      sortBy: undefined,
      sortOrder: undefined,
      search: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });

  it('derives pagination from search params', () => {
    mockUseSearch.mockReturnValue({ page: 3, limit: 25 });

    const { result } = renderHook(() => useShowsTableState());

    expect(result.current.pagination).toEqual({
      pageIndex: 2,
      pageSize: 25,
    });
  });

  it('derives sorting from search params', () => {
    mockUseSearch.mockReturnValue({ page: 1, limit: 10, sortBy: 'start_time', sortOrder: 'desc' });

    const { result } = renderHook(() => useShowsTableState());

    expect(result.current.sorting).toEqual([
      { id: 'start_time', desc: true },
    ]);
  });

  it('returns empty sorting when no sortBy', () => {
    const { result } = renderHook(() => useShowsTableState());

    expect(result.current.sorting).toEqual([]);
  });

  it('derives column filters from search params', () => {
    mockUseSearch.mockReturnValue({
      page: 1,
      limit: 10,
      search: 'test show',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T00:00:00.000Z',
    });

    const { result } = renderHook(() => useShowsTableState());

    expect(result.current.columnFilters).toEqual([
      { id: 'name', value: 'test show' },
      {
        id: 'start_time',
        value: {
          from: new Date('2026-01-01T00:00:00.000Z'),
          to: new Date('2026-01-31T00:00:00.000Z'),
        },
      },
    ]);
  });

  it('navigates on pagination change', () => {
    const { result } = renderHook(() => useShowsTableState());

    act(() => {
      result.current.onPaginationChange({ pageIndex: 2, pageSize: 20 });
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.any(Function),
      }),
    );
  });

  it('navigates on sorting change', () => {
    const { result } = renderHook(() => useShowsTableState());

    act(() => {
      result.current.onSortingChange([{ id: 'name', desc: false }]);
    });

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('navigates on column filter change', () => {
    const { result } = renderHook(() => useShowsTableState());

    act(() => {
      result.current.onColumnFiltersChange([{ id: 'name', value: 'query' }]);
    });

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('triggers normalization when limit is absent', () => {
    mockUseSearch.mockReturnValue({ page: 1 });

    renderHook(() => useShowsTableState());

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ replace: true }),
    );
  });

  it('does not trigger normalization for canonical search', () => {
    mockUseSearch.mockReturnValue({ page: 1, limit: 10 });

    renderHook(() => useShowsTableState());

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clamps page when exceeding page count', () => {
    mockUseSearch.mockReturnValue({ page: 5, limit: 10 });

    const { result } = renderHook(() => useShowsTableState());

    act(() => {
      result.current.setPageCount(3);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ replace: true }),
    );
  });

  it('does not clamp page when within page count', () => {
    mockUseSearch.mockReturnValue({ page: 2, limit: 10 });

    const { result } = renderHook(() => useShowsTableState());

    act(() => {
      result.current.setPageCount(5);
    });

    // Only the initial render navigate check — no clamp navigate
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
