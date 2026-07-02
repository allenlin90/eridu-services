'use client';

import { useNavigate } from '@tanstack/react-router';
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';

import { DataTable, DataTablePagination } from '@eridu/ui';

import { ShowsTableToolbar } from './shows-table-toolbar';

import * as m from '@/paraglide/messages.js';

type ShowsTableProps<TData extends { id: string }> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  totalCount: number;
  pageCount: number;
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  onPaginationChange: (pagination: PaginationState) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: (filters: ColumnFiltersState) => void;
  isLoading?: boolean;
  isFetching?: boolean;
};

export function ShowsTable<TData extends { id: string }>({
  columns,
  data,
  totalCount,
  pageCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  isLoading,
  isFetching,
}: ShowsTableProps<TData>) {
  const navigate = useNavigate();

  return (
    <DataTable
      columns={columns}
      data={data}
      pageCount={pageCount}
      paginationState={pagination}
      onPaginationChange={(updater) => onPaginationChange(typeof updater === 'function' ? updater(pagination) : updater)}
      sorting={sorting}
      onSortingChange={(updater) => onSortingChange(typeof updater === 'function' ? updater(sorting) : updater)}
      columnFilters={columnFilters}
      onColumnFiltersChange={(updater) => onColumnFiltersChange(typeof updater === 'function' ? updater(columnFilters) : updater)}
      isLoading={isLoading}
      isFetching={isFetching}
      emptyMessage={m['shows.noResults']()}
      manualPagination
      manualFiltering
      manualSorting
      enableRowSelection
      onRowClick={(row) => {
        navigate({
          to: '/shows/$showId',
          params: { showId: row.id },
        });
      }}
      renderToolbar={(table) => <ShowsTableToolbar table={table} />}
      renderFooter={() => (
        <DataTablePagination
          pagination={{
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
            total: totalCount,
            pageCount,
          }}
          onPaginationChange={(nextPagination) => onPaginationChange(nextPagination as PaginationState)}
        />
      )}
    />
  );
}
