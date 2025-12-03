import type { DateRange } from 'react-day-picker';

import { LoadingPage, PageTransition } from '@eridu/ui';

import { useShows } from '@/features/shows/api';
import { columns } from '@/features/shows/components/columns';
import { ShowsTable } from '@/features/shows/components/shows-table';
import { useTableUrlState } from '@/lib/hooks';
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
  const { pagination, sorting, columnFilters, onPaginationChange, onSortingChange, onColumnFiltersChange }
    = useTableUrlState('/shows/');

  // Extract filters for API
  const dateRange = columnFilters.find((filter) => filter.id === 'start_time')?.value as DateRange | undefined;

  const { data, isLoading, error } = useShows({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    start_date_from: dateRange?.from?.toISOString(),
    end_date_to: dateRange?.to?.toISOString(),
    order_by: sorting.length > 0 && sorting[0]?.id
      ? (sorting[0].id as 'created_at' | 'updated_at' | 'start_time' | 'end_time')
      : 'created_at',
    order_direction: sorting.length > 0 ? (sorting[0].desc ? 'desc' : 'asc') : 'desc',
    include_deleted: false,
  });

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
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        sorting={sorting}
        onSortingChange={onSortingChange}
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
      />
    </PageTransition>
  );
}
