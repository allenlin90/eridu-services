import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePickerWithRange,
} from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { usePerformanceShowsQuery } from '@/features/studio-performance/api/get-performance-shows';
import { usePerformanceSummaryQuery } from '@/features/studio-performance/api/get-performance-summary';
import { PerformanceShowsTable } from '@/features/studio-performance/components/performance-shows-table';
import { PerformanceSummaryCards } from '@/features/studio-performance/components/performance-summary-cards';
import { PerformanceTrendGraph } from '@/features/studio-performance/components/performance-trend-graph';
import { fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';
import {
  buildOperationalDayRange,
  getCurrentOperationalDate,
  toOperationalDateInputValue,
} from '@/lib/operational-day-range';

const performanceSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(10),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
  client_id: z.string().optional().catch(undefined),
  show_type_id: z.union([z.string(), z.array(z.string())]).optional().catch(undefined),
  platform_id: z.union([z.string(), z.array(z.string())]).optional().catch(undefined),
  name: z.string().optional().catch(undefined),
});

type PerformanceSearch = z.infer<typeof performanceSearchSchema>;

export const Route = createFileRoute('/studios/$studioId/performance')({
  validateSearch: (search) => performanceSearchSchema.parse(search),
  component: StudioPerformanceDashboard,
});

function toArrayParam(val: string | string[] | undefined): string[] | undefined {
  if (!val)
    return undefined;
  return Array.isArray(val) ? val : [val];
}

function StudioPerformanceDashboard() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const updateSearch = useCallback(
    (nextSearch: Partial<PerformanceSearch>) => {
      void navigate({
        search: (previous) => {
          const next = {
            ...previous,
            ...nextSearch,
          };
          // Clean up undefined parameters so they don't persist as empty strings in URL
          Object.keys(next).forEach((key) => {
            if (next[key as keyof PerformanceSearch] === undefined) {
              delete next[key as keyof PerformanceSearch];
            }
          });
          return next;
        },
        replace: true,
      });
    },
    [navigate],
  );

  // Default to previous 7 days (including today) if no dates are set in URL
  const dateRange = useMemo(() => {
    if (!search.date_from && !search.date_to) {
      const todayStr = getCurrentOperationalDate();
      const today = fromLocalDateInput(todayStr);
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      return buildOperationalDayRange({
        date_from: toOperationalDateInputValue(sevenDaysAgo),
        date_to: todayStr,
      });
    }
    return buildOperationalDayRange({
      date_from: search.date_from,
      date_to: search.date_to,
    });
  }, [search.date_from, search.date_to]);

  const selectedPickerRange = useMemo<DateRange>(() => {
    return {
      from: fromLocalDateInput(dateRange.dateFrom),
      to: fromLocalDateInput(dateRange.dateTo),
    };
  }, [dateRange.dateFrom, dateRange.dateTo]);

  const handleDateRangeChange = useCallback(
    (nextRange: DateRange | undefined) => {
      updateSearch({
        date_from: nextRange?.from ? toOperationalDateInputValue(nextRange.from) : undefined,
        date_to: nextRange?.to ? toOperationalDateInputValue(nextRange.to) : undefined,
        page: 1,
      });
    },
    [updateSearch],
  );

  const apiParams = useMemo(() => {
    return {
      start_date: dateRange.windowStart.toISOString(),
      end_date: dateRange.windowEnd.toISOString(),
      client_id: search.client_id ? [search.client_id] : undefined,
      show_type_id: toArrayParam(search.show_type_id),
      platform_id: toArrayParam(search.platform_id),
    };
  }, [dateRange, search.client_id, search.show_type_id, search.platform_id]);

  const summaryQuery = usePerformanceSummaryQuery(studioId, apiParams);
  const showsQuery = usePerformanceShowsQuery(studioId, {
    ...apiParams,
    page: search.page,
    limit: search.limit,
    name: search.name,
  });

  const isFetchingAny = summaryQuery.isFetching || showsQuery.isFetching;
  const handleRefresh = () => {
    void summaryQuery.refetch();
    void showsQuery.refetch();
  };

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="performance"
      deniedTitle="Performance Access Required"
      deniedDescription="Only studio admins and managers can access performance analytics."
    >
      <PageLayout
        title="Performance Dashboard"
        description="Monitor daily trends, total GMV, and viewership metrics across your shows."
      >
        <div className="space-y-6">
          {/* Date picker scope block */}
          <Card className="border-muted/60 dark:border-muted/30">
            <CardHeader className="gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Performance Date Range</CardTitle>
                <CardDescription>
                  Select the date range to display performance analytics.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full">
                <DatePickerWithRange
                  className="sm:w-72"
                  date={selectedPickerRange}
                  setDate={handleDateRangeChange}
                />
              </div>
            </CardHeader>
          </Card>

          {/* Aggregate Stats Cards */}
          <PerformanceSummaryCards
            data={summaryQuery.data}
            isLoading={summaryQuery.isLoading}
          />

          {/* Daily Trend Area Chart */}
          <PerformanceTrendGraph
            data={summaryQuery.data}
            isLoading={summaryQuery.isLoading}
          />

          {/* Detailed Shows Table */}
          <div className="rounded-xl border bg-card p-1 shadow-sm">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-lg">Show Performance Breakdown</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detailed metrics mapped per show platform channel
              </p>
            </div>
            <div className="p-3">
              <PerformanceShowsTable
                data={showsQuery.data?.data ?? []}
                total={showsQuery.data?.meta.total ?? 0}
                page={search.page}
                limit={search.limit}
                isLoading={showsQuery.isLoading}
                isFetching={isFetchingAny}
                onPageChange={(page) => updateSearch({ page })}
                onLimitChange={(limit) => updateSearch({ limit, page: 1 })}
                studioId={studioId}
                search={search}
                updateSearch={updateSearch}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
        </div>
      </PageLayout>
    </StudioRouteGuard>
  );
}
