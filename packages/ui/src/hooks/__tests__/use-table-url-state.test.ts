import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTableUrlState } from '../use-table-url-state';

// Mock dependencies
const mockNavigate = vi.fn();
let mockSearch: Record<string, unknown> = { page: 2, pageSize: 20, sortBy: 'name', sortOrder: 'desc' as const };

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}));

describe('useTableUrlState', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSearch = { page: 2, pageSize: 20, sortBy: 'name', sortOrder: 'desc' as const };
  });

  describe('initialization', () => {
    it('initializes pagination state from URL params', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      expect(result.current.pagination).toEqual({
        pageIndex: 1, // 2 - 1
        pageSize: 20,
      });
    });

    it('initializes sorting state from URL params', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      expect(result.current.sorting).toEqual([
        { id: 'name', desc: true },
      ]);
    });

    it('uses default values when URL params are missing', () => {
      mockSearch = {};
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      expect(result.current.pagination).toEqual({
        pageIndex: 0,
        pageSize: 10,
      });
      expect(result.current.sorting).toEqual([]);
    });
  });

  describe('column filters', () => {
    it('initializes search filter from URL', () => {
      mockSearch = { search: 'test query' };
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      expect(result.current.columnFilters).toEqual([
        { id: 'name', value: 'test query' },
      ]);
    });

    it('uses custom search column ID', () => {
      mockSearch = { search: 'test' };
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test', searchColumnId: 'title' }),
      );

      expect(result.current.columnFilters).toEqual([
        { id: 'title', value: 'test' },
      ]);
    });

    it('uses custom param names', () => {
      mockSearch = { name: 'test' };
      const { result } = renderHook(() =>
        useTableUrlState({
          from: '/test',
          paramNames: { search: 'name' },
        }),
      );

      expect(result.current.columnFilters).toEqual([
        { id: 'name', value: 'test' },
      ]);
    });

    it('initializes date range filter from URL', () => {
      mockSearch = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T00:00:00.000Z',
      };
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      expect(result.current.columnFilters).toEqual([
        {
          id: 'date',
          value: {
            from: new Date('2024-01-01T00:00:00.000Z'),
            to: new Date('2024-12-31T00:00:00.000Z'),
          },
        },
      ]);
    });

    it('initializes dynamic filters from URL', () => {
      mockSearch = { status: 'active', role: 'admin' };
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      expect(result.current.columnFilters).toEqual([
        { id: 'status', value: 'active' },
        { id: 'role', value: 'admin' },
      ]);
    });

    it('combines multiple filter types', () => {
      mockSearch = {
        search: 'test',
        startDate: '2024-01-01T00:00:00.000Z',
        status: 'active',
      };
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      expect(result.current.columnFilters).toEqual([
        { id: 'name', value: 'test' },
        {
          id: 'date',
          value: {
            from: new Date('2024-01-01T00:00:00.000Z'),
            to: undefined,
          },
        },
        { id: 'status', value: 'active' },
      ]);
    });
  });

  describe('pagination changes', () => {
    it('updates pagination via navigate', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      result.current.onPaginationChange({
        pageIndex: 2,
        pageSize: 10,
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.any(Function),
        }),
      );
    });

    it('handles pagination updater function', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      result.current.onPaginationChange((old) => ({
        ...old,
        pageIndex: old.pageIndex + 1,
      }));

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('sorting changes', () => {
    it('updates sorting via navigate', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      result.current.onSortingChange([{ id: 'created_at', desc: false }]);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.any(Function),
        }),
      );
    });

    it('handles sorting updater function', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      result.current.onSortingChange((old) => [
        { id: 'created_at', desc: !old[0]?.desc },
      ]);

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('clears sorting when empty array is passed', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      result.current.onSortingChange([]);

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('filter changes', () => {
    it('updates column filters via navigate', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      result.current.onColumnFiltersChange([
        { id: 'name', value: 'new search' },
      ]);

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('does not navigate if filters are unchanged', () => {
      mockSearch = { search: 'test' };
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      mockNavigate.mockClear();
      result.current.onColumnFiltersChange([
        { id: 'name', value: 'test' },
      ]);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles filter updater function', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      result.current.onColumnFiltersChange((old) => [
        ...old,
        { id: 'status', value: 'active' },
      ]);

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('page count and auto-correction', () => {
    it('provides setPageCount function', () => {
      const { result } = renderHook(() =>
        useTableUrlState({ from: '/test' }),
      );

      expect(result.current.setPageCount).toBeInstanceOf(Function);
      result.current.setPageCount(5);
      // Should not throw
    });
  });

  describe('type safety', () => {
    it('accepts generic route type parameter', () => {
      // This test verifies TypeScript compilation
      const { result } = renderHook(() =>
        useTableUrlState<'/system/users/'>({
          from: '/system/users/',
        }),
      );

      expect(result.current).toBeDefined();
    });
  });
});
