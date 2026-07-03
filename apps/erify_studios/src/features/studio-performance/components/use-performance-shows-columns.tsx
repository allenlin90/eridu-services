import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';

import type { ShowPerformanceResponse } from '@eridu/api-types/performance';

import { SortableHeader, type SortRule } from './performance-sortable-header';

import { DateCell } from '@/features/admin/components/show-table-cells';
import { toCurrencyDisplayString, toDecimalDisplayString } from '@/lib/decimal-format';

type UsePerformanceShowsColumnsParams = {
  studioId: string;
  sortRules: SortRule[];
  onSort: (columnId: string) => void;
  locale?: string;
  currency?: string;
};

/**
 * Builds the performance shows table column defs, including the per-platform
 * GMV/views/CTR/CTO cells and their currency/number/percentage formatters.
 * Sortable metric headers delegate to {@link SortableHeader} via `onSort`.
 */
export function usePerformanceShowsColumns({
  studioId,
  sortRules,
  onSort,
  locale,
  currency,
}: UsePerformanceShowsColumnsParams): ColumnDef<ShowPerformanceResponse>[] {
  const resolvedLocale = locale ?? 'th-TH';
  const resolvedCurrency = currency ?? 'THB';

  const formatPercentage = useCallback((val: string | null) => {
    if (val === null)
      return '—';
    try {
      return `${toDecimalDisplayString(val)}%`;
    } catch {
      return `${val}%`;
    }
  }, []);

  const formatCurrency = useCallback((val: string | null) => {
    if (val === null)
      return '—';
    try {
      return toCurrencyDisplayString(val, resolvedLocale, resolvedCurrency);
    } catch {
      const fallbackSymbol = resolvedCurrency === 'THB' ? '฿' : '$';
      return `${fallbackSymbol}${val}`;
    }
  }, [resolvedCurrency, resolvedLocale]);

  const formatNumber = useCallback((val: number | null) => {
    if (val === null)
      return '—';
    return new Intl.NumberFormat().format(val);
  }, []);

  return useMemo<ColumnDef<ShowPerformanceResponse>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Show Name',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <Link
              to="/studios/$studioId/shows/$showId/performance"
              params={{ studioId, showId: row.original.id }}
              search={{ page: 1, limit: 10 }}
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
        header: () => <SortableHeader columnId="gmv" label="GMV" sortRules={sortRules} onSort={onSort} />,
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
        header: () => <SortableHeader columnId="views" label="Views" sortRules={sortRules} onSort={onSort} />,
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
        header: () => <SortableHeader columnId="ctr" label="CTR" sortRules={sortRules} onSort={onSort} />,
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
        header: () => <SortableHeader columnId="cto" label="CTO" sortRules={sortRules} onSort={onSort} />,
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
        header: () => <SortableHeader columnId="start_time" label="Start Time" sortRules={sortRules} onSort={onSort} />,
        cell: ({ row }) => <DateCell date={row.original.start_time} />,
      },
    ],
    [formatCurrency, formatNumber, formatPercentage, studioId, sortRules, onSort],
  );
}
