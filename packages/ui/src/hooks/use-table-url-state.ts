import { useNavigate, useSearch } from '@tanstack/react-router';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';
import * as React from 'react';

/**
 * URL search parameters for table state
 */
export type TableUrlState = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: any;
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
  setPageCount: (count: number) => void;
};

export type TableUrlStateOptions = {
  from: string;
  autoCorrectPage?: boolean;
};

const RESERVED_KEYS = ['page', 'pageSize', 'sortBy', 'sortOrder', 'search', 'startDate', 'endDate'];

/**
 * Custom hook to synchronize URL state with table state
 * Handles conversion between URL search params and TanStack Table state objects
 */
export function useTableUrlState(options: TableUrlStateOptions): UseTableUrlStateReturn {
  const { from, autoCorrectPage = true } = options;
  const navigate = useNavigate({ from: from as never });
  const searchParams = useSearch({ from: from as never }) as unknown as TableUrlState;

  const [pageCount, setPageCount] = React.useState<number | undefined>(undefined);

  // Convert URL params to table state
  const pagination: PaginationState = React.useMemo(
    () => ({
      pageIndex: Math.max(0, (searchParams.page || 1) - 1), // Ensure pageIndex is never negative
      pageSize: searchParams.pageSize || 10,
    }),
    [searchParams.page, searchParams.pageSize],
  );

  // Auto-correct page if it's out of bounds
  React.useEffect(() => {
    // If we have data (pageCount defined) and current page is beyond total pages
    // Note: pagination.pageIndex is 0-indexed, so it must be < pageCount
    if (autoCorrectPage && pageCount !== undefined) {
      const currentPage = pagination.pageIndex + 1;
      const maxPage = Math.max(1, pageCount);

      if (currentPage > maxPage) {
        (navigate as any)({
          search: (prev: any) => ({
            ...prev,
            page: maxPage,
          }),
          replace: true,
        });
      }
    }
  }, [autoCorrectPage, pageCount, pagination.pageIndex, navigate]);

  const sorting: SortingState = React.useMemo(
    () =>
      searchParams.sortBy
        ? [{ id: searchParams.sortBy, desc: searchParams.sortOrder === 'desc' }]
        : [],
    [searchParams.sortBy, searchParams.sortOrder],
  );

  const columnFilters: ColumnFiltersState = React.useMemo(
    () => {
      const filters = [
        ...(searchParams.search ? [{ id: 'name', value: searchParams.search }] : []),
        ...(searchParams.startDate || searchParams.endDate
          ? [
              {
                id: 'date',
                value: {
                  from: searchParams.startDate ? new Date(searchParams.startDate) : undefined,
                  to: searchParams.endDate ? new Date(searchParams.endDate) : undefined,
                },
              },
            ]
          : []),
      ];

      // Add dynamic filters
      Object.entries(searchParams).forEach(([key, value]) => {
        if (!RESERVED_KEYS.includes(key) && value !== undefined && value !== null) {
          filters.push({ id: key, value });
        }
      });

      return filters;
    },
    [searchParams, searchParams.search, searchParams.startDate, searchParams.endDate],
  );

  // Update URL when table state changes
  const handlePaginationChange = React.useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
      (navigate as any)({
        search: (prev: any) => ({
          ...prev,
          page: newPagination.pageIndex + 1,
          pageSize: newPagination.pageSize,
        }),
      });
    },
    [navigate, pagination],
  );

  const handleSortingChange = React.useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      (navigate as any)({
        search: (prev: any) => ({
          ...prev,
          sortBy: newSorting[0]?.id,
          sortOrder: newSorting[0]?.desc ? 'desc' : 'asc',
        }),
      });
    },
    [navigate, sorting],
  );

  const handleColumnFiltersChange = React.useCallback(
    (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => {
      const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater;

      const searchFilter = newFilters.find((f: any) => f.id === 'name')?.value as string | undefined;
      const dateFilter = newFilters.find((f: any) => f.id === 'date')?.value as { from?: Date; to?: Date } | undefined;

      // Identify dynamic filters to remove (present in old but not in new)
      const filtersToRemove = columnFilters
        .filter((f) => f.id !== 'name' && f.id !== 'date')
        .filter((f) => !newFilters.find((nf) => nf.id === f.id))
        .map((f) => f.id);

      // Identify dynamic filters to add/update
      const dynamicFilters = newFilters
        .filter((f) => f.id !== 'name' && f.id !== 'date')
        .reduce((acc, f) => ({ ...acc, [f.id]: f.value }), {});

      (navigate as any)({
        search: (prev: any) => {
          const next = {
            ...prev,
            search: searchFilter || undefined,
            startDate: dateFilter?.from?.toISOString(),
            endDate: dateFilter?.to?.toISOString(),
            page: 1, // Reset to first page when filters change
            ...dynamicFilters,
          };

          // Remove deleted filters
          filtersToRemove.forEach((id) => {
            delete next[id];
          });

          return next;
        },
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
    setPageCount,
  };
}
