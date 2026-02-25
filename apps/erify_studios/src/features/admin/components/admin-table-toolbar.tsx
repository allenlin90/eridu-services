'use client';

import type { Table } from '@tanstack/react-table';
import * as React from 'react';

import { cn } from '@eridu/ui/lib/utils';

import { FilterChips } from './admin-table-toolbar/filter-chips';
import { FilterPopover } from './admin-table-toolbar/filter-popover';
import { QuickFilters } from './admin-table-toolbar/quick-filters';
import { SearchInput } from './admin-table-toolbar/search-input';
import type { SearchableColumn } from './admin-table-toolbar/types';

import * as m from '@/paraglide/messages.js';

// Stable empty array reference to avoid re-renders
const EMPTY_ARRAY: string[] = [];

// Re-export for backward compatibility
export type { SearchableColumn };

type AdminTableToolbarProps<TData> = {
  table: Table<TData>;
  searchColumn?: string;
  searchableColumns?: SearchableColumn[];
  searchPlaceholder?: string;
  /** Column IDs to show as quick filters inline (e.g., ['show_standard_name', 'start_time']) */
  /** Column IDs to show as quick filters inline (e.g., ['show_standard_name', 'start_time']) */
  quickFilterColumns?: string[];
  /** Column IDs to show at the top of the filter popover in a 'Featured' section */
  featuredFilterColumns?: string[];
  children?: React.ReactNode;
};

/**
 * Admin table toolbar with unified search, filter popover, and active filter chips
 */
export function AdminTableToolbar<TData>({
  table,
  searchColumn,
  searchableColumns,
  searchPlaceholder,
  quickFilterColumns = EMPTY_ARRAY,
  featuredFilterColumns = EMPTY_ARRAY,
  children,
}: AdminTableToolbarProps<TData>) {
  // Primary search column (first of searchableColumns or explicit searchColumn)
  const primaryColumnId = searchColumn ?? searchableColumns?.[0]?.id;
  const primaryColumn = primaryColumnId ? table.getColumn(primaryColumnId) : null;
  const primaryFilterValue = (primaryColumn?.getFilterValue() as string) ?? '';

  // Get quick filter configurations
  const quickFilterConfigs = React.useMemo(() => {
    if (!searchableColumns)
      return [];
    return searchableColumns.filter((col) => quickFilterColumns.includes(col.id));
  }, [searchableColumns, quickFilterColumns]);

  // Calculate active filter count (excluding primary for the popover badge)
  const activeFilterCount = React.useMemo(() => {
    const filters = table.getState().columnFilters;
    // Exclude primary column and quick filter columns from count
    const excludeIds = [primaryColumnId, ...quickFilterColumns].filter(Boolean);
    return filters.filter(
      (f) => !excludeIds.includes(f.id) && f.value !== undefined && f.value !== '',
    ).length;
  }, [table, primaryColumnId, quickFilterColumns]);

  // Columns to exclude from popover (primary + quick filters)
  const popoverExcludeColumns = React.useMemo(() => {
    return [primaryColumnId, ...quickFilterColumns].filter(Boolean) as string[];
  }, [primaryColumnId, quickFilterColumns]);

  // Handle primary search change
  const handleSearchChange = React.useCallback(
    (value: string) => {
      primaryColumn?.setFilterValue(value || undefined);
    },
    [primaryColumn],
  );

  // Handle reset all filters
  const handleResetAll = React.useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  // Handle reset non-primary filters (for popover reset)
  const handleResetPopoverFilters = React.useCallback(() => {
    const filters = table.getState().columnFilters;
    const excludeIds = [primaryColumnId, ...quickFilterColumns].filter(Boolean);

    // Clear each filter that's not in excludeIds
    filters.forEach((f) => {
      if (!excludeIds.includes(f.id)) {
        table.getColumn(f.id)?.setFilterValue(undefined);
      }
    });
  }, [table, primaryColumnId, quickFilterColumns]);

  return (
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div
        className={cn(
          'flex flex-col gap-3',
          'sm:flex-row sm:items-center sm:flex-wrap',
        )}
      >
        {/* Primary Search Input */}
        {primaryColumn && (
          <SearchInput
            value={primaryFilterValue}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder ?? m['admin.searchPlaceholder']()}
            className="w-full sm:w-64 lg:w-80"
          />
        )}

        {/* Quick Filters (inline) */}
        <QuickFilters table={table} columns={quickFilterConfigs} />

        {/* Filter Popover */}
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

      {/* Active Filter Chips */}
      {searchableColumns && (
        <FilterChips
          table={table}
          searchableColumns={searchableColumns}
          primaryColumnId={primaryColumnId}
          onClearAll={handleResetAll}
        />
      )}
    </div>
  );
}
