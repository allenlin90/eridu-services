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
  [key: string]: unknown;
};

/**
 * Parameter names for URL state
 */
export type ParamNames = {
  search: string;
  startDate: string;
  endDate: string;
};

const DEFAULT_PARAM_NAMES: ParamNames = {
  search: 'search',
  startDate: 'startDate',
  endDate: 'endDate',
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

/**
 * Options for the useTableUrlState hook
 */
export type TableUrlStateOptions<TRoute extends string> = {
  /** TanStack Router route path for type-safe navigation */
  from: TRoute;
  /** Automatically correct page number if it exceeds total pages */
  autoCorrectPage?: boolean;
  /** Column ID for search filter (default: 'name') */
  searchColumnId?: string;
  /** Column ID for date range filter (default: 'date') */
  dateColumnId?: string;
  /** Custom parameter names for URL state */
  paramNames?: Partial<ParamNames>;
  /** Default sorting state */
  defaultSorting?: SortingState;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert URL search params to PaginationState
 * Ensures pageIndex is never negative
 */
function urlToPagination(searchParams: TableUrlState): PaginationState {
  return {
    pageIndex: Math.max(0, (searchParams.page || 1) - 1),
    pageSize: searchParams.pageSize || 10,
  };
}

/**
 * Convert PaginationState to URL params
 */
function paginationToUrl(pagination: PaginationState): Pick<TableUrlState, 'page' | 'pageSize'> {
  return {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  };
}

/**
 * Convert URL search params to SortingState
 */
function urlToSorting(searchParams: TableUrlState): SortingState {
  if (!searchParams.sortBy) {
    return [];
  }
  return [{ id: searchParams.sortBy, desc: searchParams.sortOrder === 'desc' }];
}

/**
 * Convert SortingState to URL params
 */
function sortingToUrl(sorting: SortingState): Pick<TableUrlState, 'sortBy' | 'sortOrder'> {
  if (sorting.length === 0) {
    return {
      sortBy: undefined,
      sortOrder: undefined,
    };
  }
  return {
    sortBy: sorting[0]?.id,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
  };
}

/**
 * Build ColumnFiltersState from filter parameters
 */
function buildColumnFilters(
  filterParams: Record<string, unknown>,
  paramNames: ParamNames,
  searchColumnId: string,
  dateColumnId: string,
): ColumnFiltersState {
  const filters: ColumnFiltersState = [];

  // Add search filter
  if (filterParams[paramNames.search]) {
    filters.push({ id: searchColumnId, value: filterParams[paramNames.search] });
  }

  // Add date range filter
  if (filterParams[paramNames.startDate] || filterParams[paramNames.endDate]) {
    filters.push({
      id: dateColumnId,
      value: {
        from: filterParams[paramNames.startDate] ? new Date(filterParams[paramNames.startDate] as string) : undefined,
        to: filterParams[paramNames.endDate] ? new Date(filterParams[paramNames.endDate] as string) : undefined,
      },
    });
  }

  // Add dynamic filters
  const reservedFilterKeys = [paramNames.search, paramNames.startDate, paramNames.endDate];
  Object.entries(filterParams).forEach(([key, value]) => {
    if (!reservedFilterKeys.includes(key)) {
      filters.push({ id: key, value });
    }
  });

  return filters;
}

/**
 * Serialize ColumnFiltersState to URL params
 * Returns an object with filter params and resets page to 1
 */
function serializeFilters(
  filters: ColumnFiltersState,
  currentFilters: ColumnFiltersState,
  paramNames: ParamNames,
  searchColumnId: string,
  dateColumnId: string,
): Record<string, unknown> {
  // Map special filters
  const searchFilter = filters.find((f) => f.id === searchColumnId)?.value as string | undefined;
  const dateFilter = filters.find((f) => f.id === dateColumnId)?.value as
    | { from?: Date; to?: Date }
    | undefined;

  // Map all other filters as dynamic params
  const dynamicFilters = filters
    .filter((f) => f.id !== searchColumnId && f.id !== dateColumnId)
    .reduce((acc, f) => ({ ...acc, [f.id]: f.value }), {} as Record<string, unknown>);

  const result: Record<string, unknown> = {
    page: 1, // Always reset to page 1 on filter change
  };

  // Handle search
  if (searchFilter) {
    result[paramNames.search] = searchFilter;
  } else {
    result[paramNames.search] = undefined;
  }

  // Handle date range
  if (dateFilter?.from) {
    result[paramNames.startDate] = dateFilter.from.toISOString();
  } else {
    result[paramNames.startDate] = undefined;
  }

  if (dateFilter?.to) {
    result[paramNames.endDate] = dateFilter.to.toISOString();
  } else {
    result[paramNames.endDate] = undefined;
  }

  // Handle dynamic filters - need to remove old ones that are no longer present
  const currentDynamicKeys = currentFilters
    .filter((f) => f.id !== searchColumnId && f.id !== dateColumnId)
    .map((f) => f.id);

  // Mark removed filters as undefined (will be deleted from URL)
  currentDynamicKeys.forEach((key) => {
    if (!(key in dynamicFilters)) {
      result[key] = undefined;
    }
  });

  // Add/update new dynamic filters
  Object.assign(result, dynamicFilters);

  return result;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Custom hook to synchronize URL state with TanStack Table state
 *
 * This hook provides a bridge between URL search parameters and TanStack Table state objects,
 * enabling shareable, bookmarkable table states (pagination, sorting, filters).
 *
 * @example
 * ```tsx
 * const tableState = useTableUrlState<'/system/users/'>({
 *   from: '/system/users/',
 *   searchColumnId: 'name',
 *   paramNames: { search: 'name' },
 * });
 *
 * <DataTable
 *   {...tableState}
 *   data={data}
 *   columns={columns}
 * />
 * ```
 *
 * @template TRoute - The route path for type-safe navigation
 * @param options - Configuration options
 * @returns Table state and handlers for TanStack Table
 */
export function useTableUrlState<TRoute extends string>(
  options: TableUrlStateOptions<TRoute>,
): UseTableUrlStateReturn {
  const {
    from,
    autoCorrectPage = true,
    searchColumnId = 'name',
    dateColumnId = 'date',
    paramNames: customParamNames,
  } = options;

  const paramNames = React.useMemo<ParamNames>(
    () => ({ ...DEFAULT_PARAM_NAMES, ...customParamNames }),
    [customParamNames],
  );

  const navigate = useNavigate({ from });
  const searchParams = useSearch({ from }) as TableUrlState;

  const [pageCount, setPageCount] = React.useState<number | undefined>(undefined);

  // Convert URL params to table state
  const pagination: PaginationState = React.useMemo(
    () => urlToPagination(searchParams),
    [searchParams.page, searchParams.pageSize],
  );

  const sorting: SortingState = React.useMemo(
    () => urlToSorting(searchParams),
    [searchParams.sortBy, searchParams.sortOrder],
  );

  // Extract filter params with granular memoization
  // Only recompute when actual filter values change, not when pagination changes
  const searchValue = searchParams[paramNames.search];
  const startDateValue = searchParams[paramNames.startDate];
  const endDateValue = searchParams[paramNames.endDate];

  // Extract dynamic filter keys and values
  const dynamicFilterEntries = React.useMemo(() => {
    const reservedKeys = [
      'page',
      'pageSize',
      'sortBy',
      'sortOrder',
      paramNames.search,
      paramNames.startDate,
      paramNames.endDate,
    ];
    return Object.entries(searchParams).filter(
      ([key, value]) => !reservedKeys.includes(key) && value !== undefined && value !== null,
    );
  }, [searchParams, paramNames]);

  // Build filter params object with stable reference
  const filterParams = React.useMemo(() => {
    const params: Record<string, unknown> = {};

    if (searchValue)
      params[paramNames.search] = searchValue;
    if (startDateValue)
      params[paramNames.startDate] = startDateValue;
    if (endDateValue)
      params[paramNames.endDate] = endDateValue;

    dynamicFilterEntries.forEach(([key, value]) => {
      params[key] = value;
    });

    return params;
  }, [searchValue, startDateValue, endDateValue, dynamicFilterEntries, paramNames]);

  const columnFilters: ColumnFiltersState = React.useMemo(
    () => buildColumnFilters(filterParams, paramNames, searchColumnId, dateColumnId),
    [filterParams, paramNames, searchColumnId, dateColumnId],
  );

  // Auto-correct page if it's out of bounds
  React.useEffect(() => {
    if (autoCorrectPage && pageCount !== undefined) {
      const currentPage = pagination.pageIndex + 1;
      const maxPage = Math.max(1, pageCount);

      if (currentPage > maxPage) {
        navigate({
          search: (prev) => ({
            ...prev,
            page: maxPage,
          }),
          replace: true,
        });
      }
    }
  }, [autoCorrectPage, pageCount, pagination.pageIndex, navigate]);

  // Update URL when table state changes
  const handlePaginationChange = React.useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
      navigate({
        search: (prev) => ({
          ...prev,
          ...paginationToUrl(newPagination),
        }),
      });
    },
    [navigate, pagination],
  );

  const handleSortingChange = React.useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      navigate({
        search: (prev) => ({
          ...prev,
          ...sortingToUrl(newSorting),
        }),
      });
    },
    [navigate, sorting],
  );

  const handleColumnFiltersChange = React.useCallback(
    (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => {
      const nextFilters = typeof updater === 'function' ? updater(columnFilters) : updater;

      // Check if filters actually changed to avoid unnecessary navigation
      const filtersChanged = JSON.stringify(nextFilters) !== JSON.stringify(columnFilters);
      if (!filtersChanged)
        return;

      const filterUpdates = serializeFilters(nextFilters, columnFilters, paramNames, searchColumnId, dateColumnId);

      navigate({
        search: (prev) => {
          const next = { ...prev };

          // Apply all filter updates
          Object.entries(filterUpdates).forEach(([key, value]) => {
            if (value === undefined) {
              delete next[key];
            } else {
              next[key] = value;
            }
          });

          return next;
        },
      });
    },
    [navigate, columnFilters, paramNames, searchColumnId, dateColumnId],
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
