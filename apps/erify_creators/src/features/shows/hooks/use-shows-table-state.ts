import { getRouteApi } from '@tanstack/react-router';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import {
  shouldNormalizeShowsSearch,
  type ShowsSearch,
  toCanonicalShowsSearch,
} from '@/features/shows/config/shows-search-schema';

const showsRouteApi = getRouteApi('/shows/');

type UseShowsTableStateReturn = {
  pagination: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  onPaginationChange: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void;
  onSortingChange: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  onColumnFiltersChange: (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => void;
  setPageCount: (count: number) => void;
};

function toIsoString(value: Date | string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export function useShowsTableState(): UseShowsTableStateReturn {
  const search = showsRouteApi.useSearch();
  const navigate = showsRouteApi.useNavigate();
  const [pageCount, setPageCount] = useState<number | undefined>(undefined);

  const needsNormalization = shouldNormalizeShowsSearch(search);

  useEffect(() => {
    if (!needsNormalization) {
      return;
    }

    void navigate({
      search: (previous: ShowsSearch) => toCanonicalShowsSearch(previous),
      replace: true,
    });
  }, [navigate, needsNormalization]);

  const limit = search.limit ?? 10;

  const pagination = useMemo<PaginationState>(() => ({
    pageIndex: Math.max((search.page ?? 1) - 1, 0),
    pageSize: limit,
  }), [limit, search.page]);

  const sorting = useMemo<SortingState>(() => {
    if (!search.sortBy) {
      return [];
    }

    return [{
      id: search.sortBy,
      desc: search.sortOrder === 'desc',
    }];
  }, [search.sortBy, search.sortOrder]);

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const filters: ColumnFiltersState = [];

    if (search.search) {
      filters.push({ id: 'name', value: search.search });
    }

    if (search.startDate || search.endDate) {
      const dateRange: DateRange = {
        from: search.startDate ? new Date(search.startDate) : undefined,
        to: search.endDate ? new Date(search.endDate) : undefined,
      };
      filters.push({ id: 'start_time', value: dateRange });
    }

    return filters;
  }, [search.endDate, search.search, search.startDate]);

  useEffect(() => {
    if (pageCount === undefined) {
      return;
    }

    const currentPage = search.page ?? 1;
    const maxPage = Math.max(pageCount, 1);
    if (currentPage <= maxPage) {
      return;
    }

    void navigate({
      search: (previous: ShowsSearch) => ({
        ...toCanonicalShowsSearch(previous),
        page: maxPage,
      }),
      replace: true,
    });
  }, [navigate, pageCount, search.page]);

  const onPaginationChange = useCallback((
    updater: PaginationState | ((old: PaginationState) => PaginationState),
  ) => {
    const nextPagination = typeof updater === 'function' ? updater(pagination) : updater;

    void navigate({
      search: (previous: ShowsSearch) => ({
        ...toCanonicalShowsSearch(previous),
        page: nextPagination.pageIndex + 1,
        limit: nextPagination.pageSize,
      }),
    });
  }, [navigate, pagination]);

  const onSortingChange = useCallback((
    updater: SortingState | ((old: SortingState) => SortingState),
  ) => {
    const nextSorting = typeof updater === 'function' ? updater(sorting) : updater;
    const firstSort = nextSorting[0];

    void navigate({
      search: (previous: ShowsSearch) => ({
        ...toCanonicalShowsSearch(previous),
        sortBy: firstSort?.id,
        sortOrder: firstSort ? (firstSort.desc ? 'desc' : 'asc') : undefined,
      }),
    });
  }, [navigate, sorting]);

  const onColumnFiltersChange = useCallback((
    updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState),
  ) => {
    const nextFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
    const nameFilter = nextFilters.find((filter) => filter.id === 'name')?.value as string | undefined;
    const dateFilter = nextFilters.find((filter) => filter.id === 'start_time')?.value as DateRange | undefined;

    void navigate({
      search: (previous: ShowsSearch) => ({
        ...toCanonicalShowsSearch(previous),
        page: 1,
        search: nameFilter || undefined,
        startDate: toIsoString(dateFilter?.from),
        endDate: toIsoString(dateFilter?.to),
      }),
    });
  }, [columnFilters, navigate]);

  return {
    pagination,
    sorting,
    columnFilters,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    setPageCount,
  };
}
