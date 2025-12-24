import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTableUrlState } from '../use-table-url-state';

// Mock dependencies
const mockNavigate = vi.fn();
const mockSearch = { page: 2, pageSize: 20, sortBy: 'name', sortOrder: 'desc' };

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}));

describe('useTableUrlState', () => {
  it('initializes state from URL params', () => {
    const { result } = renderHook(() =>
      useTableUrlState({ from: '/test' }),
    );

    expect(result.current.pagination).toEqual({
      pageIndex: 1, // 2 - 1
      pageSize: 20,
    });
    expect(result.current.sorting).toEqual([
      { id: 'name', desc: true },
    ]);
  });

  it('updates pagination via navigate', () => {
    const { result } = renderHook(() =>
      useTableUrlState({ from: '/test' }),
    );

    result.current.onPaginationChange({
      pageIndex: 2,
      pageSize: 10,
    });

    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({
      search: expect.any(Function),
    }));
  });

  it('updates sorting via navigate', () => {
    const { result } = renderHook(() =>
      useTableUrlState({ from: '/test' }),
    );

    result.current.onSortingChange([{ id: 'created_at', desc: false }]);

    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({
      search: expect.any(Function),
    }));
  });
});
