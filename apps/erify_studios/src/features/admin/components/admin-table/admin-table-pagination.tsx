import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import { Button } from '@eridu/ui';

type AdminTablePaginationProps = {
  pagination: {
    pageIndex: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
};

export function AdminTablePagination({
  pagination,
  onPaginationChange,
}: AdminTablePaginationProps) {
  return (
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
  );
}
