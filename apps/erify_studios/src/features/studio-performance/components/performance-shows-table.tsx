import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import type { ShowPerformanceResponse } from '@eridu/api-types/performance';
import {
  DataTable,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import { DateCell } from '@/features/admin/components/show-table-cells';
import { toCurrencyDisplayString, toDecimalDisplayString } from '@/lib/decimal-format';

type PerformanceShowsTableProps = {
  data: ShowPerformanceResponse[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  studioId: string;
};

export function PerformanceShowsTable({
  data,
  total,
  page,
  limit,
  isLoading,
  isFetching,
  onPageChange,
  onLimitChange,
  studioId,
}: PerformanceShowsTableProps) {
  const pageCount = Math.ceil(total / limit);

  const formatPercentage = (val: string | null) => {
    if (val === null)
      return '—';
    try {
      return `${toDecimalDisplayString(val)}%`;
    } catch {
      return `${val}%`;
    }
  };

  const formatCurrency = (val: string | null) => {
    if (val === null)
      return '—';
    try {
      return toCurrencyDisplayString(val);
    } catch {
      return `$${val}`;
    }
  };

  const formatNumber = (val: number | null) => {
    if (val === null)
      return '—';
    return new Intl.NumberFormat().format(val);
  };

  const columns = useMemo<ColumnDef<ShowPerformanceResponse>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Show Name',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <Link
              to="/studios/$studioId/shows/$showId"
              params={{ studioId, showId: row.original.id }}
              className="font-semibold text-primary hover:underline"
            >
              {row.original.name}
            </Link>
            {row.original.show_type_name && (
              <span className="text-xs text-muted-foreground">{row.original.show_type_name}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'client_name',
        header: 'Client',
        cell: ({ row }) => <span>{row.original.client_name ?? '—'}</span>,
      },
      {
        id: 'platforms',
        header: 'Platform',
        cell: ({ row }) => {
          const platforms = row.original.platforms;
          if (platforms.length === 0)
            return <span className="text-muted-foreground text-xs">No platforms</span>;
          return (
            <div className="flex flex-col gap-1.5 py-1">
              {platforms.map((p) => (
                <div key={p.show_platform_uid} className="text-xs font-medium text-foreground h-5 flex items-center">
                  {p.platform_name}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        id: 'gmv',
        header: 'GMV',
        cell: ({ row }) => {
          const platforms = row.original.platforms;
          if (platforms.length === 0)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-1.5 py-1">
              {platforms.map((p) => (
                <div key={p.show_platform_uid} className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 h-5 flex items-center">
                  {formatCurrency(p.gmv)}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        id: 'views',
        header: 'Views',
        cell: ({ row }) => {
          const platforms = row.original.platforms;
          if (platforms.length === 0)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-1.5 py-1">
              {platforms.map((p) => (
                <div key={p.show_platform_uid} className="text-xs text-foreground h-5 flex items-center">
                  {formatNumber(p.views)}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        id: 'ctr',
        header: 'CTR',
        cell: ({ row }) => {
          const platforms = row.original.platforms;
          if (platforms.length === 0)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-1.5 py-1">
              {platforms.map((p) => (
                <div key={p.show_platform_uid} className="text-xs text-amber-600 dark:text-amber-500 h-5 flex items-center">
                  {formatPercentage(p.ctr)}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        id: 'cto',
        header: 'CTO',
        cell: ({ row }) => {
          const platforms = row.original.platforms;
          if (platforms.length === 0)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-1.5 py-1">
              {platforms.map((p) => (
                <div key={p.show_platform_uid} className="text-xs text-violet-600 dark:text-violet-500 h-5 flex items-center">
                  {formatPercentage(p.cto)}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'start_time',
        header: 'Start Time',
        cell: ({ row }) => <DateCell date={row.original.start_time} />,
      },
    ],
    [studioId],
  );

  return (
    <div className="space-y-4">
      <DataTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No performance data found for the selected criteria."
        manualPagination
        pageCount={pageCount}
        paginationState={{
          pageIndex: page - 1,
          pageSize: limit,
        }}
        onPaginationChange={(updater) => {
          if (typeof updater === 'function') {
            const nextState = updater({ pageIndex: page - 1, pageSize: limit });
            onPageChange(nextState.pageIndex + 1);
            onLimitChange(nextState.pageSize);
          } else {
            onPageChange(updater.pageIndex + 1);
            onLimitChange(updater.pageSize);
          }
        }}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="name"
            searchPlaceholder="Search shows..."
            searchableColumns={[]}
          />
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={{
              pageIndex: page - 1,
              pageSize: limit,
              total,
              pageCount,
            }}
            onPaginationChange={(updater) => {
              if (typeof updater === 'function') {
                const nextState = updater({ pageIndex: page - 1, pageSize: limit });
                onPageChange(nextState.pageIndex + 1);
                onLimitChange(nextState.pageSize);
              } else {
                onPageChange(updater.pageIndex + 1);
                onLimitChange(updater.pageSize);
              }
            }}
          />
        )}
      />
    </div>
  );
}
