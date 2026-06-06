import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { RefreshCw, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import {
  AsyncCombobox,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePickerWithRange,
  Label,
} from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { MultiSelect } from '@/components/task-templates/shared/multi-select';
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
  show_type_id: z.union([z.string(), z.array(z.string())]).optional().catch(undefined),
  platform_id: z.union([z.string(), z.array(z.string())]).optional().catch(undefined),
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
  const [clientSearch, setClientSearch] = useState('');

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
    (key: 'client_id', value: string) => {
      updateSearch({
        [key]: value || undefined,
        page: 1,
      });
    },
    [updateSearch],
  );

  const handleMultiFilterChange = useCallback(
    (key: 'show_type_id' | 'platform_id', value: string[]) => {
      updateSearch({
        [key]: value.length > 0 ? value : undefined,
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

  const clientOptions = useMemo(() => {
    const allClients = (lookups?.clients ?? []).map((c) => ({
      value: c.id,
      label: c.name,
    }));
    if (!clientSearch)
      return allClients;
    const lower = clientSearch.toLowerCase();
    return allClients.filter((c) => c.label.toLowerCase().includes(lower));
  }, [lookups?.clients, clientSearch]);

  const showTypeOptions = useMemo(() => {
    return (lookups?.show_types ?? []).map((st) => ({
      value: st.id,
      label: st.name,
    }));
  }, [lookups?.show_types]);

  const platformOptions = useMemo(() => {
    return (lookups?.platforms ?? []).map((p) => ({
      value: p.id,
      label: p.name,
    }));
  }, [lookups?.platforms]);

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
        description="Monitor daily trends, total GMV, and viewership metrics across your shows."
      >
        <div className="space-y-6">
          {/* Filters Card Panel */}
          <Card className="border-muted/60 dark:border-muted/30">
            <CardHeader className="gap-4 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Filter Performance Data</CardTitle>
                <CardDescription>
                  Select date range and filter by clients, show types, and platforms.
                </CardDescription>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 w-full">
                {/* Date Range Picker */}
                <div className="space-y-1.5">
                  <Label>Date Range</Label>
                  <DatePickerWithRange
                    date={selectedPickerRange}
                    setDate={handleDateRangeChange}
                    className="w-full"
                  />
                </div>

                {/* Clients Combobox */}
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <AsyncCombobox
                    value={search.client_id ?? ''}
                    onChange={(val) => handleFilterChange('client_id', val)}
                    onSearch={setClientSearch}
                    options={clientOptions}
                    placeholder="Search Client..."
                  />
                </div>

                {/* Show Types MultiSelect */}
                <div className="space-y-1.5">
                  <Label>Show Types</Label>
                  <MultiSelect
                    options={showTypeOptions}
                    value={toArrayParam(search.show_type_id) ?? []}
                    onChange={(val) => handleMultiFilterChange('show_type_id', val)}
                    placeholder="Any Show Type"
                  />
                </div>

                {/* Platforms MultiSelect */}
                <div className="space-y-1.5">
                  <Label>Platforms</Label>
                  <MultiSelect
                    options={platformOptions}
                    value={toArrayParam(search.platform_id) ?? []}
                    onChange={(val) => handleMultiFilterChange('platform_id', val)}
                    placeholder="Any Platform"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3 mt-1">
                <div className="text-xs text-muted-foreground">
                  {isAnyFilterActive ? 'Filters applied' : 'Showing all records'}
                </div>
                <div className="flex items-center gap-2">
                  {isAnyFilterActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="mr-1 h-4 w-4" />
                      Reset Filters
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
