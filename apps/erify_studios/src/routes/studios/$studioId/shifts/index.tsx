import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePickerWithRange,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { StudioShiftsCalendar } from '@/features/studio-shifts/components/studio-shifts-calendar';
import { StudioShiftsTable } from '@/features/studio-shifts/components/studio-shifts-table';
import { useShiftCalendar } from '@/features/studio-shifts/hooks/use-studio-shifts';
import {
  createDefaultShiftPlanningRange,
  createShiftPlanningRangeFromStart,
  type ShiftCalendarDateRange,
} from '@/features/studio-shifts/utils/shift-calendar-range.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import {
  toCalendarViewSearch,
  toTableViewSearch,
} from '@/features/studio-shifts/utils/studio-shifts-route-search.utils';

const shiftsRouteApi = getRouteApi('/studios/$studioId/shifts');

export const Route = createFileRoute('/studios/$studioId/shifts/')({
  component: StudioShiftsPage,
});

type ShiftCostSnapshotCardProps = {
  studioId: string;
  dateRange: ShiftCalendarDateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onResetDateRange: () => void;
};

const ShiftCostSnapshotCard = memo(({
  studioId,
  dateRange,
  onDateRangeChange,
  onResetDateRange,
}: ShiftCostSnapshotCardProps) => {
  const orchestrationQueryParams = useMemo(() => ({
    date_from: dateRange.date_from,
    date_to: dateRange.date_to,
    include_cancelled: false,
  }), [dateRange.date_from, dateRange.date_to]);
  const planningDateRange: DateRange = {
    from: new Date(`${dateRange.date_from}T00:00:00`),
    to: new Date(`${dateRange.date_to}T00:00:00`),
  };
  const {
    data: shiftCalendarResponse,
    isLoading: isLoadingShiftCalendar,
    isFetching: isFetchingShiftCalendar,
    refetch: refetchShiftCalendar,
  } = useShiftCalendar(studioId, orchestrationQueryParams, { enabled: true });

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">Shift Cost Snapshot</CardTitle>
          <CardDescription>
            Admin-only cost summary for upcoming shift planning.
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <DatePickerWithRange
            date={planningDateRange}
            setDate={onDateRangeChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onResetDateRange}
            disabled={isFetchingShiftCalendar}
          >
            Next 7 Days
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => void refetchShiftCalendar()}
            disabled={isFetchingShiftCalendar}
            aria-label="Refresh shift cost snapshot"
          >
            <RefreshCw className={`h-4 w-4 ${isFetchingShiftCalendar ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(isLoadingShiftCalendar || isFetchingShiftCalendar)
          ? (
              <p className="text-sm text-muted-foreground">Aggregating shift costs...</p>
            )
          : (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Projected:
                  {' '}
                  <span className="font-medium text-foreground">
                    $
                    {shiftCalendarResponse?.summary.total_projected_cost ?? '0.00'}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Calculated:
                  {' '}
                  <span className="font-medium text-foreground">
                    $
                    {shiftCalendarResponse?.summary.total_calculated_cost ?? '0.00'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {shiftCalendarResponse?.summary.shift_count ?? 0}
                  {' '}
                  shifts ·
                  {' '}
                  {shiftCalendarResponse?.summary.total_hours ?? 0}
                  {' '}
                  hours
                </p>
              </div>
            )}
      </CardContent>
    </Card>
  );
});

function StudioShiftsPage() {
  const { studioId } = shiftsRouteApi.useParams();
  const search = shiftsRouteApi.useSearch();
  const routeNavigate = shiftsRouteApi.useNavigate();
  const [defaultPlanningRange] = useState(() => createDefaultShiftPlanningRange());

  const viewMode = search.view;
  const effectivePlanningRange = useMemo(() => ({
    date_from: search.date_from ?? defaultPlanningRange.date_from,
    date_to: search.date_to ?? defaultPlanningRange.date_to,
  }), [
    defaultPlanningRange.date_from,
    defaultPlanningRange.date_to,
    search.date_from,
    search.date_to,
  ]);

  const updateSearch = useCallback((
    updater: (previous: typeof search) => typeof search,
    options?: { replace?: boolean },
  ) => {
    void routeNavigate({
      to: '/studios/$studioId/shifts',
      params: { studioId },
      search: updater,
      replace: options?.replace ?? true,
    });
  }, [routeNavigate, studioId]);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    const fallbackRange = createDefaultShiftPlanningRange();
    const nextFrom = range?.from ? toLocalDateInputValue(range.from) : fallbackRange.date_from;
    const nextTo = range?.to
      ? toLocalDateInputValue(range.to)
      : createShiftPlanningRangeFromStart(nextFrom).date_to;

    updateSearch((previous) => ({
      ...previous,
      page: 1,
      date_from: nextFrom,
      date_to: nextTo,
    }));
  }, [updateSearch]);

  const handleResetDateRange = useCallback(() => {
    const nextRange = createDefaultShiftPlanningRange();
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      date_from: nextRange.date_from,
      date_to: nextRange.date_to,
    }));
  }, [updateSearch]);

  const handleToggleView = (mode: 'calendar' | 'table') => {
    updateSearch((prev) => {
      if (mode === 'calendar') {
        return toCalendarViewSearch();
      }
      return toTableViewSearch(prev);
    }, { replace: false });
  };

  return (
    <PageLayout
      title="Studio Shift Schedule"
      description="Plan and manage upcoming studio shifts."
      actions={(
        <div className="inline-flex shrink-0 rounded-md border bg-background p-1">
          <Button
            size="sm"
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            onClick={() => handleToggleView('calendar')}
          >
            Calendar
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            onClick={() => handleToggleView('table')}
          >
            Table
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="grid gap-4">
          <ShiftCostSnapshotCard
            studioId={studioId}
            dateRange={effectivePlanningRange}
            onDateRangeChange={handleDateRangeChange}
            onResetDateRange={handleResetDateRange}
          />
        </div>

        {viewMode === 'calendar'
          ? (
              <StudioShiftsCalendar
                studioId={studioId}
              />
            )
          : (
              <StudioShiftsTable
                studioId={studioId}
                isStudioAdmin
                search={{
                  ...search,
                  date_from: effectivePlanningRange.date_from,
                  date_to: effectivePlanningRange.date_to,
                }}
                updateSearch={updateSearch}
              />
            )}
      </div>
    </PageLayout>
  );
}
