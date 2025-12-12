// Import after mocking
import * as router from '@tanstack/react-router';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTableUrlState } from '../use-table-url-state';

// Mock TanStack Router
const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: vi.fn(() => ({})),
}));

// Get the mocked useSearch function
const mockUseSearch = vi.mocked(router.useSearch);

describe('useTableUrlState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default pagination state when no URL params', () => {
    const { result } = renderHook(() => useTableUrlState('/shows'));

    expect(result.current.pagination).toEqual({
      pageIndex: 0,
      pageSize: 10,
    });
  });

  it('converts URL page and page_size to pagination state', () => {
    mockUseSearch.mockReturnValue({
      page: 3,
      page_size: 25,
    });

    const { result } = renderHook(() => useTableUrlState('/shows'));

    expect(result.current.pagination).toEqual({
      pageIndex: 2, // pageIndex is page - 1
      pageSize: 25,
    });
  });

  it('ensures pageIndex is never negative', () => {
    mockUseSearch.mockReturnValue({
      page: 0,
    });

    const { result } = renderHook(() => useTableUrlState('/shows'));

    expect(result.current.pagination.pageIndex).toBe(0);
  });

  it('returns empty sorting when no sort params', () => {
    const { result } = renderHook(() => useTableUrlState('/shows'));

    expect(result.current.sorting).toEqual([]);
  });

  it('converts URL sort params to sorting state', () => {
    mockUseSearch.mockReturnValue({
      sort_by: 'name',
      sort_order: 'desc',
    });

    const { result } = renderHook(() => useTableUrlState('/shows'));

    expect(result.current.sorting).toEqual([
      { id: 'name', desc: true },
    ]);
  });

  it('handles asc sort order', () => {
    mockUseSearch.mockReturnValue({
      sort_by: 'created_at',
      sort_order: 'asc',
    });

    const { result } = renderHook(() => useTableUrlState('/shows'));

    expect(result.current.sorting).toEqual([
      { id: 'created_at', desc: false },
    ]);
  });

  it('returns empty column filters when no search or date params', () => {
    const { result } = renderHook(() => useTableUrlState('/shows'));

    expect(result.current.columnFilters).toEqual([]);
  });

  it('converts search param to name filter', () => {
    mockUseSearch.mockReturnValue({
      search: 'test show',
    });

    const { result } = renderHook(() => useTableUrlState('/shows'));

    expect(result.current.columnFilters).toEqual([
      { id: 'name', value: 'test show' },
    ]);
  });

  it('converts date params to start_time filter', () => {
    mockUseSearch.mockReturnValue({
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-31T23:59:59.999Z',
    });

    const { result } = renderHook(() => useTableUrlState('/shows'));

    expect(result.current.columnFilters).toEqual([
      {
        id: 'start_time',
        value: {
          from: new Date('2024-01-01T00:00:00.000Z'),
          to: new Date('2024-01-31T23:59:59.999Z'),
        },
      },
    ]);
  });

  it('combines search and date filters', () => {
    mockUseSearch.mockReturnValue({
      search: 'test show',
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-31T23:59:59.999Z',
    });

    const { result } = renderHook(() => useTableUrlState('/shows'));

    expect(result.current.columnFilters).toEqual([
      { id: 'name', value: 'test show' },
      {
        id: 'start_time',
        value: {
          from: new Date('2024-01-01T00:00:00.000Z'),
          to: new Date('2024-01-31T23:59:59.999Z'),
        },
      },
    ]);
  });

  it('updates URL when pagination changes', () => {
    const { result } = renderHook(() => useTableUrlState('/shows'));

    act(() => {
      result.current.onPaginationChange({
        pageIndex: 2,
        pageSize: 20,
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      search: expect.any(Function),
    });
  });

  it('updates URL when sorting changes', () => {
    const { result } = renderHook(() => useTableUrlState('/shows'));

    act(() => {
      result.current.onSortingChange([
        { id: 'name', desc: true },
      ]);
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      search: expect.any(Function),
    });
  });

  it('updates URL when column filters change', () => {
    const { result } = renderHook(() => useTableUrlState('/shows'));

    act(() => {
      result.current.onColumnFiltersChange([
        { id: 'name', value: 'test' },
      ]);
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      search: expect.any(Function),
    });
  });

  it('resets page to 1 when filters change', () => {
    mockUseSearch.mockReturnValue({
      page: 5, // Current page is 5
    });

    const { result } = renderHook(() => useTableUrlState('/shows'));

    act(() => {
      result.current.onColumnFiltersChange([
        { id: 'name', value: 'new search' },
      ]);
    });

    // Verify that the search function sets page to 1
    const navigateCall = mockNavigate.mock.calls[0][0];
    const searchUpdater = navigateCall.search;
    const mockPrev = {};
    const newSearch = searchUpdater(mockPrev);

    expect(newSearch.page).toBe(1);
  });
});
