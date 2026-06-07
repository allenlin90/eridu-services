import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useCallback, useMemo } from 'react';
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
import { useCostsShiftsQuery } from '@/features/studio-costs/api/get-costs-shifts';
import { useCostsShowsQuery } from '@/features/studio-costs/api/get-costs-shows';
import { useCostsSummaryQuery } from '@/features/studio-costs/api/get-costs-summary';
import { CostsSummaryCards } from '@/features/studio-costs/components/costs-summary-cards';
import { ShiftCostsTable } from '@/features/studio-costs/components/shift-costs-table';
import { ShowCostsTable } from '@/features/studio-costs/components/show-costs-table';
import { fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';
import { useActiveStudio } from '@/lib/hooks/use-active-studio';
import {
  buildOperationalDayRange,
  getCurrentOperationalDate,
  toOperationalDateInputValue,
} from '@/lib/operational-day-range';

const CostsTrendGraph = lazy(() =>
  import('@/features/studio-costs/components/costs-trend-graph').then(
    (module) => ({ default: module.CostsTrendGraph }),
  ),
);

const costsSearchSchema = z.object({
  tab: z.enum(['shows', 'shifts']).optional().catch('shows'),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),

  // Shared filters
  client_id: z.string().optional().catch(undefined),
  show_type_id: z.union([z.string(), z.array(z.string())]).optional().catch(undefined),
  show_standard_id: z.union([z.string(), z.array(z.string())]).optional().catch(undefined),

  // Shows-specific filters/pagination
  shows_page: z.coerce.number().int().min(1).catch(1),
  shows_limit: z.coerce.number().int().min(1).catch(10),
  shows_name: z.string().optional().catch(undefined),
  shows_sort: z.string().optional().catch(undefined),

  // Shifts-specific filters/pagination
  shifts_page: z.coerce.number().int().min(1).catch(1),
  shifts_limit: z.coerce.number().int().min(1).catch(10),
  shifts_name: z.string().optional().catch(undefined),
  shifts_role: z.string().optional().catch(undefined),
  shifts_status: z.string().optional().catch(undefined),
  shifts_sort: z.string().optional().catch(undefined),
});

type CostsSearch = z.infer<typeof costsSearchSchema>;

export const Route = createFileRoute('/studios/$studioId/costs')({
  validateSearch: (search) => costsSearchSchema.parse(search),
  component: StudioCostsDashboard,
});

function toArrayParam(val: string | string[] | undefined): string[] | undefined {
  if (!val)
    return undefined;
  return Array.isArray(val) ? val : [val];
}

function StudioCostsDashboard() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { activeStudio } = useActiveStudio();

  const updateSearch = useCallback(
    (nextSearch: Partial<CostsSearch>) => {
      void navigate({
        search: (previous) => {
          const next = {
            ...previous,
            ...nextSearch,
          };
          // Clean up undefined parameters so they don't persist as empty strings in URL
          Object.keys(next).forEach((key) => {
            if (next[key as keyof CostsSearch] === undefined) {
              delete next[key as keyof CostsSearch];
            }
          });
          return next;
        },
        replace: true,
      });
    },
    [navigate],
  );

  // Default date range lookup
  const dateRange = useMemo(() => {
    if (!search.date_from && !search.date_to) {
      const defaultDays = (activeStudio?.studio as any)?.metadata?.planning?.defaultDashboardRangeDays ?? 7;
      const todayStr = getCurrentOperationalDate();
      const today = fromLocalDateInput(todayStr);
      const startRange = new Date(today);
      startRange.setDate(today.getDate() - (defaultDays - 1));
      return buildOperationalDayRange({
        date_from: toOperationalDateInputValue(startRange),
        date_to: todayStr,
      });
    }
    return buildOperationalDayRange({
      date_from: search.date_from,
      date_to: search.date_to,
    });
  }, [search.date_from, search.date_to, activeStudio]);

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
        shows_page: 1,
        shifts_page: 1,
      });
    },
    [updateSearch],
  );

  const sharedApiParams = useMemo(() => {
    return {
      start_date: dateRange.windowStart.toISOString(),
      end_date: dateRange.windowEnd.toISOString(),
      client_id: search.client_id ? [search.client_id] : undefined,
      show_type_id: toArrayParam(search.show_type_id),
      show_standard_id: toArrayParam(search.show_standard_id),
    };
  }, [dateRange, search.client_id, search.show_type_id, search.show_standard_id]);

  // Query summary details
  const summaryQuery = useCostsSummaryQuery(studioId, sharedApiParams);

  // Query show costs detail
  const showCostsQuery = useCostsShowsQuery(studioId, {
    ...sharedApiParams,
    page: search.shows_page,
    limit: search.shows_limit,
    name: search.shows_name,
    sort: search.shows_sort,
  });

  // Query shift costs detail
  const shiftCostsQuery = useCostsShiftsQuery(studioId, {
    ...sharedApiParams,
    page: search.shifts_page,
    limit: search.shifts_limit,
    member_name: search.shifts_name,
    role: search.shifts_role,
    status: search.shifts_status as any,
    sort: search.shifts_sort,
  });

  const activeTab = search.tab ?? 'shows';

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="costs"
      deniedTitle="Costs Dashboard Access Required"
      deniedDescription="Only studio admins and managers can access post-production cost reviews."
    >
      <PageLayout
        title="Costs Dashboard"
        description="Review post-production creator payouts, operator labor costs, and overall economics."
      >
        <div className="space-y-6">
          {/* Date range selection */}
          <Card className="border-muted/60 dark:border-muted/30">
            <CardHeader className="gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Operational Cost Range</CardTitle>
                <CardDescription>
                  Select the operational date range to display cost analytics.
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

          {/* Aggregates Summary */}
          <CostsSummaryCards
            data={summaryQuery.data}
            isLoading={summaryQuery.isLoading}
          />

          {/* Stacked Cost Composition Graph */}
          <Suspense fallback={<div className="h-88 w-full animate-pulse rounded-xl bg-muted/20" />}>
            <CostsTrendGraph
              data={summaryQuery.data}
              isLoading={summaryQuery.isLoading}
            />
          </Suspense>

          {/* Breakdown Tabs and Tables */}
          <div className="rounded-xl border bg-card p-1 shadow-sm">
            <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">Cost Breakdown</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Detailed show and shift operator expenses
                </p>
              </div>
              <div className="flex bg-muted/50 p-1 rounded-lg self-start sm:self-auto gap-1 border">
                <button
                  type="button"
                  onClick={() => updateSearch({ tab: 'shows' })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                    activeTab === 'shows'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Show Payouts (
                  {summaryQuery.data?.total_shows_count ?? 0}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => updateSearch({ tab: 'shifts' })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                    activeTab === 'shifts'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Shift Labor (
                  {summaryQuery.data?.total_shifts_count ?? 0}
                  )
                </button>
              </div>
            </div>

            <div className="p-3">
              {activeTab === 'shows'
                ? (
                    <ShowCostsTable
                      data={showCostsQuery.data?.data ?? []}
                      total={showCostsQuery.data?.meta.total ?? 0}
                      page={search.shows_page}
                      limit={search.shows_limit}
                      isLoading={showCostsQuery.isLoading}
                      isFetching={showCostsQuery.isFetching}
                      onPageChange={(page) => updateSearch({ shows_page: page })}
                      onLimitChange={(limit) => updateSearch({ shows_limit: limit, shows_page: 1 })}
                      studioId={studioId}
                      search={{
                        page: search.shows_page,
                        limit: search.shows_limit,
                        date_from: search.date_from,
                        date_to: search.date_to,
                        client_id: search.client_id,
                        show_type_id: search.show_type_id,
                        show_standard_id: search.show_standard_id,
                        name: search.shows_name,
                        sort: search.shows_sort,
                      }}
                      updateSearch={(next) =>
                        updateSearch({
                          shows_page: next.page,
                          shows_limit: next.limit,
                          shows_name: next.name,
                          shows_sort: next.sort,
                          client_id: next.client_id,
                          show_type_id: next.show_type_id,
                          show_standard_id: next.show_standard_id,
                        })}
                      locale={summaryQuery.data?.locale}
                      currency={summaryQuery.data?.currency}
                    />
                  )
                : (
                    <ShiftCostsTable
                      data={shiftCostsQuery.data?.data ?? []}
                      total={shiftCostsQuery.data?.meta.total ?? 0}
                      page={search.shifts_page}
                      limit={search.shifts_limit}
                      isLoading={shiftCostsQuery.isLoading}
                      isFetching={shiftCostsQuery.isFetching}
                      onPageChange={(page) => updateSearch({ shifts_page: page })}
                      onLimitChange={(limit) => updateSearch({ shifts_limit: limit, shifts_page: 1 })}
                      search={{
                        page: search.shifts_page,
                        limit: search.shifts_limit,
                        date_from: search.date_from,
                        date_to: search.date_to,
                        member_name: search.shifts_name,
                        role: search.shifts_role,
                        status: search.shifts_status,
                        sort: search.shifts_sort,
                      }}
                      updateSearch={(next) =>
                        updateSearch({
                          shifts_page: next.page,
                          shifts_limit: next.limit,
                          shifts_name: next.member_name,
                          shifts_role: next.role,
                          shifts_status: next.status,
                          shifts_sort: next.sort,
                        })}
                      locale={summaryQuery.data?.locale}
                      currency={summaryQuery.data?.currency}
                    />
                  )}
            </div>
          </div>
        </div>
      </PageLayout>
    </StudioRouteGuard>
  );
}
