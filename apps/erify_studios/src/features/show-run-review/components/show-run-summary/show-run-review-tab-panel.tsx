import type { ColumnDef, PaginationState, Updater } from '@tanstack/react-table';

import {
  Button,
  DataTable,
  DataTablePagination,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { SHOW_RUN_REVIEW_PAGE_SIZE } from './constants';

export type TabFilterOption = { value: string; label: string };

/** Sentinel value the "show everything" filter option must use. */
export const ALL_FILTER_VALUE = 'ALL';

type ShowRunReviewTabPanelProps<TRow> = {
  searchPlaceholder: string;
  searchValue: string | undefined;
  onSearchChange: (value: string | undefined) => void;
  filterPlaceholder: string;
  filterValue: string | undefined;
  onFilterChange: (value: string | undefined) => void;
  /** First entry must be the `ALL_FILTER_VALUE` "show everything" option. */
  filterOptions: TabFilterOption[];
  columns: ColumnDef<TRow>[];
  rows: TRow[];
  isLoading: boolean;
  isFetching: boolean;
  emptyMessage: string;
  page: number;
  total: number;
  pageCount: number;
  onPaginationChange: (updater: Updater<PaginationState>) => void;
  isExporting: boolean;
  onExport: () => void;
};

/**
 * One Show Run Review exception-log tab: a search box, a status/severity
 * filter, an Export CSV action, and a server-paginated DataTable. Every tab
 * (creators / violations / tasks / shows) shares this shell — only the
 * columns, copy, filter options, and bound query differ.
 */
export function ShowRunReviewTabPanel<TRow>({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filterPlaceholder,
  filterValue,
  onFilterChange,
  filterOptions,
  columns,
  rows,
  isLoading,
  isFetching,
  emptyMessage,
  page,
  total,
  pageCount,
  onPaginationChange,
  isExporting,
  onExport,
}: ShowRunReviewTabPanelProps<TRow>) {
  const paginationState: PaginationState = {
    pageIndex: page - 1,
    pageSize: SHOW_RUN_REVIEW_PAGE_SIZE,
  };

  return (
    <div className="space-y-4 min-w-0 w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
          <Input
            placeholder={searchPlaceholder}
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange(e.target.value || undefined)}
            className="max-w-md w-full"
          />
          <Select
            value={filterValue ?? ALL_FILTER_VALUE}
            onValueChange={(val) => onFilterChange(val === ALL_FILTER_VALUE ? undefined : val)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={filterPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting || total === 0}
        >
          {isExporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage={emptyMessage}
        manualPagination
        pageCount={pageCount}
        paginationState={paginationState}
        onPaginationChange={onPaginationChange}
        renderFooter={() => (
          <DataTablePagination
            pagination={{
              pageIndex: paginationState.pageIndex,
              pageSize: paginationState.pageSize,
              total,
              pageCount,
            }}
            onPaginationChange={onPaginationChange}
          />
        )}
      />
    </div>
  );
}
