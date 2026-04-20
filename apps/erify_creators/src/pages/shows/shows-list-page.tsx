import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';
import { useEffect } from 'react';
import type { DateRange } from 'react-day-picker';

import { LoadingPage } from '@eridu/ui';

import { PageContainer } from '@/components/layouts/page-container';
import { PageLayout } from '@/components/layouts/page-layout';
import { useMyShows } from '@/features/shows/api/shows.api';
import { columns } from '@/features/shows/components/columns';
import { ShowsTable } from '@/features/shows/components/shows-table';
import { useShowsTableState } from '@/features/shows/hooks/use-shows-table-state';
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
  } = useShowsTableState();

  // Extract filters for API
  const dateRange = columnFilters.find((filter: { id: string; value: unknown }) => filter.id === 'start_time')
    ?.value as DateRange | undefined;
  const nameFilter = columnFilters.find((filter: { id: string; value: unknown }) => filter.id === 'name')
    ?.value as string | undefined;

  // Helper to convert date values (which may be strings from URL) to ISO strings
  const toISOStringOrUndefined = (date: Date | string | undefined): string | undefined => {
    if (!date)
      return undefined;
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString();
  };

  const { data, isLoading, isFetching, error } = useMyShows({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
    start_date_from: toISOStringOrUndefined(dateRange?.from),
    start_date_to: toISOStringOrUndefined(dateRange?.to),
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
    <PageContainer>
      <PageLayout title={m['shows.title']()}>
        <ShowsTable
          columns={columns}
          data={data?.data ?? []}
          totalCount={data?.meta?.total ?? 0}
          pageCount={data?.meta?.totalPages ?? 0}
          pagination={pagination as PaginationState}
          onPaginationChange={onPaginationChange}
          sorting={sorting as SortingState}
          onSortingChange={onSortingChange}
          columnFilters={columnFilters as ColumnFiltersState}
          onColumnFiltersChange={onColumnFiltersChange}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </PageLayout>
    </PageContainer>
  );
}
