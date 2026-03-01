import type {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  isLoading?: boolean;
  isFetching?: boolean;
  emptyMessage?: string;
  manualPagination?: boolean;
  manualFiltering?: boolean;
  manualSorting?: boolean;
  pageCount?: number;
  paginationState?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  enableRowSelection?: boolean | ((row: import('@tanstack/react-table').Row<TData>) => boolean);
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  getRowId?: (row: TData) => string;
  renderToolbar?: (table: import('@tanstack/react-table').Table<TData>) => React.ReactNode;
  renderFooter?: (table: import('@tanstack/react-table').Table<TData>) => React.ReactNode;
};

export function DataTable<TData>({
  data,
  columns,
  isLoading,
  isFetching,
  emptyMessage = 'No data available',
  manualPagination,
  manualFiltering,
  manualSorting,
  pageCount,
  paginationState,
  onPaginationChange,
  columnFilters,
  onColumnFiltersChange,
  sorting,
  onSortingChange,
  enableRowSelection,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  renderToolbar,
  renderFooter,
}: DataTableProps<TData>) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: !!manualPagination,
    manualFiltering: !!manualFiltering,
    manualSorting: !!manualSorting,
    pageCount,
    enableRowSelection,
    onRowSelectionChange,
    state: {
      ...(paginationState ? { pagination: paginationState } : {}),
      ...(columnFilters ? { columnFilters } : {}),
      ...(sorting ? { sorting } : {}),
      ...(rowSelection !== undefined ? { rowSelection } : {}),
    },
    onPaginationChange,
    onColumnFiltersChange,
    onSortingChange,
  });

  return (
    <div className="space-y-4">
      {renderToolbar?.(table)}
      <div className="rounded-md border overflow-x-auto relative">
        <div className="relative">
          {isFetching && !isLoading && (
            <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-primary/20 overflow-hidden animate-in fade-in duration-300">
              <div className="h-full w-1/3 bg-primary animate-[infinite-scroll_2s_linear_infinite]" />
            </div>
          )}
          <div className="transition-all duration-300 ease-in-out opacity-100">
            {isLoading
              ? (
                  <div className="animate-in fade-in duration-500">
                    <TableSkeleton
                      columnCount={columns.length}
                      rowCount={paginationState?.pageSize || 10}
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
                              <TableHead
                                key={header.id}
                                className={cn('whitespace-nowrap', (header.column.columnDef.meta as { className?: string })?.className)}
                              >
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
                      <TableBody
                        className={cn(
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
                                  colSpan={columns.length}
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
      {renderFooter?.(table)}
    </div>
  );
}

// Backward-compatible alias for existing imports during incremental migration.
export const DataTableCore = DataTable;
