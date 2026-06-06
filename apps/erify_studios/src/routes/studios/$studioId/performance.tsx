import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { RefreshCw, X } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import {
  Button,
  DatePickerWithRange,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';
import { usePerformanceShowsQuery } from '@/features/studio-performance/api/get-performance-shows';
import { usePerformanceSummaryQuery } from '@/features/studio-performance/api/get-performance-summary';
import { PerformanceShowsTable } from '@/features/studio-performance/components/performance-shows-table';
import { PerformanceSummaryCards } from '@/features/studio-performance/components/performance-summary-cards';
import { PerformanceTrendGraph } from '@/features/studio-performance/components/performance-trend-graph';
import { fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';
import {
  buildOperationalDayRange,
  toOperationalDateInputValue,
} from '@/lib/operational-day-range';

const performanceSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(10),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
  client_id: z.string().optional().catch(undefined),
  show_type_id: z.string().optional().catch(undefined),
  platform_id: z.string().optional().catch(undefined),
});

type PerformanceSearch = z.infer<typeof performanceSearchSchema>;

export const Route = createFileRoute('/studios/$studioId/performance')({
  validateSearch: (search) => performanceSearchSchema.parse(search),
  component: StudioPerformanceDashboard,
});

function StudioPerformanceDashboard() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const updateSearch = useCallback(
    (nextSearch: Partial<PerformanceSearch>) => {
      void navigate({
        search: (previous) => ({
          ...previous,
          ...nextSearch,
        }),
        replace: true,
      });
    },
    [navigate],
  );

  const dateRange = useMemo(
    () => buildOperationalDayRange({ date_from: search.date_from, date_to: search.date_to }),
    [search.date_from, search.date_to],
  );

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

  const handleFilterChange = useCallback(
    (key: 'client_id' | 'show_type_id' | 'platform_id', value: string) => {
      updateSearch({
        [key]: value === 'all' ? undefined : value,
        page: 1,
      });
    },
    [updateSearch],
  );

  const handleResetFilters = useCallback(() => {
    updateSearch({
      date_from: undefined,
      date_to: undefined,
      client_id: undefined,
      show_type_id: undefined,
      platform_id: undefined,
      page: 1,
    });
  }, [updateSearch]);

  const { data: lookups } = useShowLookupsQuery(studioId);

  const apiParams = useMemo(() => {
    return {
      start_date: dateRange.windowStart.toISOString(),
      end_date: dateRange.windowEnd.toISOString(),
      client_id: search.client_id ? [search.client_id] : undefined,
      show_type_id: search.show_type_id ? [search.show_type_id] : undefined,
      platform_id: search.platform_id ? [search.platform_id] : undefined,
    };
  }, [dateRange, search.client_id, search.show_type_id, search.platform_id]);

  const summaryQuery = usePerformanceSummaryQuery(studioId, apiParams);
  const showsQuery = usePerformanceShowsQuery(studioId, {
    ...apiParams,
    page: search.page,
    limit: search.limit,
  });

  const isAnyFilterActive = Boolean(
    search.date_from || search.date_to || search.client_id || search.show_type_id || search.platform_id,
  );

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
        description="Monitor daily trends, total GMV, viewership metrics, CTR, and platform conversion rates across your shows."
      >
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
              <DatePickerWithRange
                date={selectedPickerRange}
                setDate={handleDateRangeChange}
                className="w-full sm:w-64"
              />

              <Select
                value={search.client_id ?? 'all'}
                onValueChange={(val) => handleFilterChange('client_id', val)}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {(lookups?.clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={search.show_type_id ?? 'all'}
                onValueChange={(val) => handleFilterChange('show_type_id', val)}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Select Show Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Show Types</SelectItem>
                  {(lookups?.show_types ?? []).map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={search.platform_id ?? 'all'}
                onValueChange={(val) => handleFilterChange('platform_id', val)}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Select Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {(lookups?.platforms ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isAnyFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
                disabled={isFetchingAny}
                aria-label="Refresh Dashboard"
              >
                <RefreshCw className={`h-4 w-4 ${isFetchingAny ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

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
                isFetching={showsQuery.isFetching}
                onPageChange={(page) => updateSearch({ page })}
                onLimitChange={(limit) => updateSearch({ limit, page: 1 })}
                studioId={studioId}
              />
            </div>
          </div>
        </div>
      </PageLayout>
    </StudioRouteGuard>
  );
}
