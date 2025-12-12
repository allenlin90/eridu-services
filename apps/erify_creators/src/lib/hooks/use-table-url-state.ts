import { useNavigate, useSearch } from '@tanstack/react-router';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

/**
 * URL search parameters for table state
 */
export type TableUrlState = {
  page: number;
  page_size: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  from?: string;
  to?: string;
};

/**
 * Return type for the useTableUrlState hook
 */
export type UseTableUrlStateReturn = {
  pagination: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  onPaginationChange: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void;
  onSortingChange: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  onColumnFiltersChange: (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => void;
};

/**
 * Custom hook to synchronize URL state with table state
 * Handles conversion between URL search params and TanStack Table state objects
 */
export function useTableUrlState(from: string): UseTableUrlStateReturn {
  const navigate = useNavigate({ from: from as never });
  const searchParams = useSearch({ from: from as never }) as unknown as TableUrlState;

  // Convert URL params to table state
  const pagination: PaginationState = React.useMemo(
    () => ({
      pageIndex: Math.max(0, (searchParams.page || 1) - 1), // Ensure pageIndex is never negative
      pageSize: searchParams.page_size || 10,
    }),
    [searchParams.page, searchParams.page_size],
  );

  const sorting: SortingState = React.useMemo(
    () =>
      searchParams.sort_by
        ? [{ id: searchParams.sort_by, desc: searchParams.sort_order === 'desc' }]
        : [],
    [searchParams.sort_by, searchParams.sort_order],
  );

  const columnFilters: ColumnFiltersState = React.useMemo(
    () => [
      ...(searchParams.search ? [{ id: 'name', value: searchParams.search }] : []),
      ...(searchParams.from || searchParams.to
        ? [
            {
              id: 'start_time',
              value: {
                from: searchParams.from ? new Date(searchParams.from) : undefined,
                to: searchParams.to ? new Date(searchParams.to) : undefined,
              } as DateRange,
            },
          ]
        : []),
    ],
    [searchParams.search, searchParams.from, searchParams.to],
  );

  // Update URL when table state changes
  const handlePaginationChange = React.useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
      (navigate as unknown as (options: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => void)({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          page: newPagination.pageIndex + 1,
          page_size: newPagination.pageSize,
        }),
      });
    },
    [navigate, pagination],
  );

  const handleSortingChange = React.useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      (navigate as unknown as (options: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => void)({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          sort_by: newSorting[0]?.id,
          sort_order: newSorting[0]?.desc ? 'desc' : 'asc',
        }),
      });
    },
    [navigate, sorting],
  );

  const handleColumnFiltersChange = React.useCallback(
    (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => {
      const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater;

      const searchFilter = newFilters.find((f) => f.id === 'name')?.value as string | undefined;
      const dateFilter = newFilters.find((f) => f.id === 'start_time')?.value as DateRange | undefined;

      (navigate as unknown as (options: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => void)({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          search: searchFilter || undefined,
          from: dateFilter?.from?.toISOString(),
          to: dateFilter?.to?.toISOString(),
          page: 1, // Reset to first page when filters change
        }),
      });
    },
    [navigate, columnFilters],
  );

  return {
    pagination,
    sorting,
    columnFilters,
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
  };
}
