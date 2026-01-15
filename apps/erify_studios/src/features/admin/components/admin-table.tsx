import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@eridu/ui';

import { AdminTableToolbar } from './admin-table-toolbar';

type AdminTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  isLoading?: boolean;
  isFetching?: boolean;
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;
  emptyMessage?: string;
  // Pagination props
  pagination?: {
    pageIndex: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
  // Filtering props
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  searchColumn?: string;
  searchPlaceholder?: string;
};

export function AdminTable<TData>({
  data,
  columns,
  isLoading,
  isFetching,
  onEdit,
  onDelete,
  emptyMessage = 'No data available',
  pagination,
  onPaginationChange,
  columnFilters,
  onColumnFiltersChange,
  searchColumn,
  searchPlaceholder,
}: AdminTableProps<TData>) {
  // Add actions column if edit or delete handlers are provided
  const columnsWithActions: ColumnDef<TData>[] = [
    ...columns,
    ...(onEdit || onDelete
      ? [
          {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }: { row: { original: TData } }) => (
              <div className="flex gap-2">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(row.original)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(row.original)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ),
          } as ColumnDef<TData>,
        ]
      : []),
  ];

  const table = useReactTable({
    data,
    columns: columnsWithActions,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: !!pagination,
    manualFiltering: !!onColumnFiltersChange,
    pageCount: pagination?.pageCount,
    state: {
      ...(pagination
        ? {
            pagination: {
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
            },
          }
        : {}),
      ...(columnFilters ? { columnFilters } : {}),
    },
    onPaginationChange: pagination && onPaginationChange
      ? (updater) => {
          const nextPagination
            = typeof updater === 'function'
              ? updater({
                  pageIndex: pagination.pageIndex,
                  pageSize: pagination.pageSize,
                })
              : updater;
          onPaginationChange(nextPagination);
        }
      : undefined,
    onColumnFiltersChange: onColumnFiltersChange
      ? (updater) => {
          const nextFilters
            = typeof updater === 'function'
              ? updater(columnFilters || [])
              : updater;
          onColumnFiltersChange(nextFilters);
        }
      : undefined,
  });

  return (
    <div className="space-y-4">
      <AdminTableToolbar
        table={table}
        searchColumn={searchColumn}
        searchPlaceholder={searchPlaceholder}
      />
      <div className="rounded-md border overflow-x-auto relative">
        {isFetching && !isLoading && (
          <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-primary/10 overflow-hidden">
            <div className="h-full w-1/3 bg-primary animate-[infinite-scroll_2s_linear_infinite]" />
          </div>
        )}
        {isLoading
          ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )
          : (
              <div className="min-w-full inline-block align-middle">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="whitespace-nowrap">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length > 0
                      ? table.getRowModel().rows.map((row) => (
                          <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} className="whitespace-nowrap">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : (
                          <TableRow>
                            <TableCell
                              colSpan={columnsWithActions.length}
                              className="h-24 text-center text-muted-foreground"
                            >
                              {emptyMessage}
                            </TableCell>
                          </TableRow>
                        )}
                  </TableBody>
                </Table>
              </div>
            )}
      </div>
      {pagination && onPaginationChange && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
          <div className="text-sm text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
            Showing
            {' '}
            {(pagination.pageIndex * pagination.pageSize) + 1}
            {' '}
            to
            {' '}
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.total)}
            {' '}
            of
            {' '}
            {pagination.total}
            {' '}
            entries
          </div>
          <div className="flex flex-col-reverse sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8 order-1 sm:order-2">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
              <select
                value={pagination.pageSize}
                onChange={(e) => {
                  onPaginationChange({ pageIndex: 0, pageSize: Number(e.target.value) });
                }}
                className="h-8 w-[70px] rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page
                {' '}
                {pagination.pageIndex + 1}
                {' '}
                of
                {' '}
                {pagination.pageCount}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => onPaginationChange({ pageIndex: 0, pageSize: pagination.pageSize })}
                  disabled={pagination.pageIndex === 0}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => onPaginationChange({ pageIndex: pagination.pageIndex - 1, pageSize: pagination.pageSize })}
                  disabled={pagination.pageIndex === 0}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => onPaginationChange({ pageIndex: pagination.pageIndex + 1, pageSize: pagination.pageSize })}
                  disabled={pagination.pageIndex >= pagination.pageCount - 1}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => onPaginationChange({ pageIndex: pagination.pageCount - 1, pageSize: pagination.pageSize })}
                  disabled={pagination.pageIndex >= pagination.pageCount - 1}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
