import type {
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  SortingState,
  Updater,
} from '@tanstack/react-table';

export type TablePaginationModel = {
  pageIndex: number;
  pageSize: number;
};

export function resolveUpdater<T>(updater: Updater<T>, current: T): T {
  if (typeof updater === 'function') {
    return (updater as (value: T) => T)(current);
  }
  return updater;
}

export function adaptPaginationChange(
  pagination: TablePaginationModel | undefined,
  onPaginationChange?: (pagination: TablePaginationModel) => void,
): OnChangeFn<PaginationState> | undefined {
  if (!pagination || !onPaginationChange) {
    return undefined;
  }

  return (updater) => {
    const nextPagination = resolveUpdater(updater, pagination);
    onPaginationChange(nextPagination);
  };
}

export function adaptColumnFiltersChange(
  columnFilters: ColumnFiltersState | undefined,
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void,
): OnChangeFn<ColumnFiltersState> | undefined {
  if (!onColumnFiltersChange) {
    return undefined;
  }

  return (updater) => {
    const nextFilters = resolveUpdater(updater, columnFilters ?? []);
    onColumnFiltersChange(nextFilters);
  };
}

export function adaptSortingChange(
  sorting: SortingState | undefined,
  onSortingChange?: (sorting: SortingState) => void,
): OnChangeFn<SortingState> | undefined {
  if (!onSortingChange) {
    return undefined;
  }

  return (updater) => {
    const nextSorting = resolveUpdater(updater, sorting ?? []);
    onSortingChange(nextSorting);
  };
}
