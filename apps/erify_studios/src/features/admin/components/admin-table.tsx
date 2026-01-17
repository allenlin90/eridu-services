import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/react-table';
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
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { AdminTableToolbar, type SearchableColumn } from './admin-table-toolbar';

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
  searchableColumns?: SearchableColumn[];
  searchPlaceholder?: string;
  // Sorting props
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  // Extra actions
  renderExtraActions?: (row: TData) => React.ReactNode;
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
  searchableColumns,
  searchPlaceholder,
  sorting,
  onSortingChange,
  renderExtraActions,
}: AdminTableProps<TData>) {
  // Add actions column if edit or delete handlers are provided
  const columnsWithActions: ColumnDef<TData>[] = [
    ...columns,
    ...(onEdit || onDelete || renderExtraActions
      ? [
          {
            id: 'actions',
            cell: ({ row }: { row: { original: TData } }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  {renderExtraActions && renderExtraActions(row.original)}
                  {renderExtraActions && (onEdit || onDelete) && <DropdownMenuSeparator />}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(row.original)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(row.original)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
            // Ensure actions column is always visible and minimal width
            size: 50,
            enableHiding: false,
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
    manualSorting: !!onSortingChange,
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
      ...(sorting ? { sorting } : {}),
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
    onSortingChange: onSortingChange
      ? (updater) => {
          const nextSorting
            = typeof updater === 'function'
              ? updater(sorting || [])
              : updater;
          onSortingChange(nextSorting);
        }
      : undefined,
  });

  return (
    <div className="space-y-4">
      <AdminTableToolbar
        table={table}
        searchColumn={searchColumn}
        searchableColumns={searchableColumns}
        searchPlaceholder={searchPlaceholder}
      />
      <div className="rounded-md border overflow-x-auto relative">
        <div className="relative">
          {/* Progress bar for background fetches (only if not initial loading) */}
          {isFetching && !isLoading && (
            <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-primary/20 overflow-hidden animate-in fade-in duration-300">
              <div className="h-full w-1/3 bg-primary animate-[infinite-scroll_2s_linear_infinite]" />
            </div>
          )}

          <div className={cn(
            'transition-all duration-300 ease-in-out',
            isLoading ? 'opacity-100' : 'opacity-100',
          )}
          >
            {isLoading
              ? (
                  <div className="animate-in fade-in duration-500">
                    <TableSkeleton
                      columnCount={columnsWithActions.length}
                      rowCount={pagination?.pageSize || 10}
                    />
                  </div>
                )
              : (
                  <div className="min-w-full inline-block align-middle animate-in fade-in duration-300">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id} className={cn('whitespace-nowrap', (header.column.columnDef.meta as { className?: string })?.className)}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  ) || <span className="text-muted-foreground">-</span>}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody className={cn(
                        'transition-opacity duration-300 ease-in-out',
                        isFetching && 'opacity-50 pointer-events-none cursor-wait',
                      )}
                      >
                        {table.getRowModel().rows.length > 0
                          ? table.getRowModel().rows.map((row) => (
                              <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                  <TableCell key={cell.id} className={cn('whitespace-nowrap', (cell.column.columnDef.meta as { className?: string })?.className)}>
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
        </div>
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
