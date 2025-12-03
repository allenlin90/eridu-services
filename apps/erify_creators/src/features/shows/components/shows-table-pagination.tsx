'use client';

import type { Table } from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import { Button } from '@eridu/ui';

import * as m from '@/paraglide/messages.js';

type ShowsTablePaginationProps<TData> = {
  table: Table<TData>;
};

export function ShowsTablePagination<TData>({
  table,
}: ShowsTablePaginationProps<TData>) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2">
      <div className="hidden sm:block text-sm text-muted-foreground">
        {m['table.rowsSelected']({
          selected: table.getFilteredSelectedRowModel().rows.length,
          total: table.getFilteredRowModel().rows.length,
        })}
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-2 sm:space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium hidden sm:block">{m['table.rowsPerPage']()}</p>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="h-8 w-[70px] rounded-md border border-input bg-transparent px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-center text-sm font-medium min-w-[100px]">
          {m['table.page']({
            current: table.getState().pagination.pageIndex + 1,
            total: table.getPageCount(),
          })}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden lg:flex h-8 w-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{m['table.goToFirstPage']()}</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{m['table.goToPreviousPage']()}</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{m['table.goToNextPage']()}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden lg:flex h-8 w-8 p-0"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{m['table.goToLastPage']()}</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
