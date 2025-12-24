import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';
import { useEffect } from 'react';
import type { DateRange } from 'react-day-picker';

import { LoadingPage, PageTransition, useTableUrlState } from '@eridu/ui';

import { useShows } from '@/features/shows/api';
import { columns } from '@/features/shows/components/columns';
import { ShowsTable } from '@/features/shows/components/shows-table';
import * as m from '@/paraglide/messages.js';

/**
 * Shows List Page Component
 *
 * Handles page-level concerns:
 * - Data fetching via TanStack Query
 * - Error handling
 * - Page structure and layout
 * - URL state management for filters, sorting, and pagination
 */
export function ShowsListPage() {
  const {
    pagination,
    sorting,
    columnFilters,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    setPageCount,
  } = useTableUrlState({ from: '/shows/' });

  // Extract filters for API
  const dateRange = columnFilters.find((filter: { id: string; value: unknown }) => filter.id === 'start_time')
    ?.value as DateRange | undefined;
  const nameFilter = columnFilters.find((filter: { id: string; value: unknown }) => filter.id === 'name')
    ?.value as string | undefined;

  const { data, isLoading, error } = useShows({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
    start_date_from: dateRange?.from?.toISOString(),
    start_date_to: dateRange?.to?.toISOString(),
    order_by: sorting.length > 0 && sorting[0]?.id
      ? (sorting[0].id as 'created_at' | 'updated_at' | 'start_time' | 'end_time')
      : 'start_time',
    order_direction: sorting.length > 0 ? (sorting[0].desc ? 'desc' : 'asc') : 'desc',
    include_deleted: false,
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  if (isLoading && !data) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="font-semibold text-red-800">{m['pages.error']()}</h3>
          <p className="text-red-600 mt-1">{m['pages.failedToLoadShows']()}</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{m['shows.title']()}</h1>
      </div>
      <ShowsTable
        columns={columns}
        data={data?.data ?? []}
        pageCount={data?.meta?.totalPages ?? -1}
        pagination={pagination as PaginationState}
        onPaginationChange={onPaginationChange}
        sorting={sorting as SortingState}
        onSortingChange={onSortingChange}
        columnFilters={columnFilters as ColumnFiltersState}
        onColumnFiltersChange={onColumnFiltersChange}
      />
    </PageTransition>
  );
}
