'use client';

import * as React from 'react';

import { cn } from '@eridu/ui/lib/utils';

import { FilterChips } from './toolbar/filter-chips';
import { FilterPopover } from './toolbar/filter-popover';
import { QuickFilters } from './toolbar/quick-filters';
import { SearchInput } from './toolbar/search-input';
import type {
  DataTableToolbarProps,
  SearchableColumn,
} from './toolbar/types';

const EMPTY_ARRAY: string[] = [];

export type { SearchableColumn };

export function DataTableToolbar<TData>({
  table,
  searchColumn,
  searchableColumns,
  searchPlaceholder,
  quickFilterColumns = EMPTY_ARRAY,
  featuredFilterColumns = EMPTY_ARRAY,
  resetButtonLabel,
  children,
}: DataTableToolbarProps<TData>) {
  const primaryColumnId = searchColumn ?? searchableColumns?.[0]?.id;
  const primaryColumn = primaryColumnId ? table.getColumn(primaryColumnId) : null;
  const primaryFilterValue = (primaryColumn?.getFilterValue() as string) ?? '';

  const quickFilterConfigs = React.useMemo(() => {
    if (!searchableColumns)
      return [];
    return searchableColumns.filter((col) => quickFilterColumns.includes(col.id));
  }, [searchableColumns, quickFilterColumns]);
  const searchableColumnIds = React.useMemo(
    () => searchableColumns?.map((column) => column.id) ?? EMPTY_ARRAY,
    [searchableColumns],
  );

  const activeFilterCount = React.useMemo(() => {
    const filters = table.getState().columnFilters;
    const excludeIds = [primaryColumnId, ...quickFilterColumns].filter(Boolean);
    return filters.filter(
      (f) => searchableColumnIds.includes(f.id) && !excludeIds.includes(f.id) && f.value !== undefined && f.value !== '',
    ).length;
  }, [table, primaryColumnId, quickFilterColumns, searchableColumnIds]);

  const popoverExcludeColumns = React.useMemo(() => {
    return [primaryColumnId, ...quickFilterColumns].filter(Boolean) as string[];
  }, [primaryColumnId, quickFilterColumns]);

  const handleSearchChange = React.useCallback(
    (value: string) => {
      primaryColumn?.setFilterValue(value || undefined);
    },
    [primaryColumn],
  );

  const handleResetAll = React.useCallback(() => {
    const filters = table.getState().columnFilters;
    const nextFilters = filters.filter((filter) => {
      if (!searchableColumnIds.includes(filter.id)) {
        return true;
      }
      return filter.id === primaryColumnId;
    });

    table.setColumnFilters(nextFilters);
  }, [primaryColumnId, searchableColumnIds, table]);

  const handleResetPopoverFilters = React.useCallback(() => {
    const filters = table.getState().columnFilters;
    const excludeIds = [primaryColumnId, ...quickFilterColumns].filter(Boolean);
    const nextFilters = filters.filter((filter) => {
      if (!searchableColumnIds.includes(filter.id)) {
        return true;
      }

      return excludeIds.includes(filter.id);
    });

    table.setColumnFilters(nextFilters);
  }, [table, primaryColumnId, quickFilterColumns, searchableColumnIds]);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex flex-col gap-3',
          'sm:flex-row sm:items-center sm:flex-wrap',
        )}
      >
        {primaryColumn && (
          <SearchInput
            value={primaryFilterValue}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder ?? 'Search...'}
            className="w-full sm:w-64 lg:w-80"
          />
        )}

        <QuickFilters table={table} columns={quickFilterConfigs} />

        {searchableColumns && searchableColumns.length > popoverExcludeColumns.length && (
          <FilterPopover
            table={table}
            searchableColumns={searchableColumns}
            excludeColumns={popoverExcludeColumns}
            featuredColumns={featuredFilterColumns}
            onReset={handleResetPopoverFilters}
            activeFilterCount={activeFilterCount}
          />
        )}
        {children}
      </div>

      {searchableColumns && (
        <FilterChips
          table={table}
          searchableColumns={searchableColumns}
          primaryColumnId={primaryColumnId}
          onClearAll={handleResetAll}
          resetButtonLabel={resetButtonLabel ?? 'Reset'}
        />
      )}
    </div>
  );
}
