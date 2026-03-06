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

import { StudioShiftsCalendar } from '@/features/studio-shifts/components/studio-shifts-calendar';
import { StudioShiftsTable } from '@/features/studio-shifts/components/studio-shifts-table';
import { useShiftCalendar } from '@/features/studio-shifts/hooks/use-studio-shifts';
import { addDays, fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import {
  toCalendarViewSearch,
  toTableViewSearch,
} from '@/features/studio-shifts/utils/studio-shifts-route-search.utils';

const SUMMARY_RANGE_DAYS = 7;
const shiftsRouteApi = getRouteApi('/studios/$studioId/shifts');

export const Route = createFileRoute('/studios/$studioId/shifts/')({
  component: StudioShiftsPage,
});

function getDefaultSummaryPlanningRange() {
  const from = toLocalDateInputValue(new Date());
  const to = toLocalDateInputValue(addDays(fromLocalDateInput(from), SUMMARY_RANGE_DAYS));
  return { from, to };
}

const ShiftCostSnapshotCard = memo(({ studioId }: { studioId: string }) => {
  const [planningDateFrom, setPlanningDateFrom] = useState(() => getDefaultSummaryPlanningRange().from);
  const [planningDateTo, setPlanningDateTo] = useState(() => getDefaultSummaryPlanningRange().to);
  const orchestrationQueryParams = useMemo(() => ({
    date_from: planningDateFrom,
    date_to: planningDateTo,
    include_cancelled: false,
  }), [planningDateFrom, planningDateTo]);
  const planningDateRange: DateRange | undefined = planningDateFrom || planningDateTo
    ? {
        from: planningDateFrom ? new Date(`${planningDateFrom}T00:00:00`) : undefined,
        to: planningDateTo ? new Date(`${planningDateTo}T00:00:00`) : undefined,
      }
    : undefined;
  const {
    data: shiftCalendarResponse,
    isLoading: isLoadingShiftCalendar,
    isFetching: isFetchingShiftCalendar,
    refetch: refetchShiftCalendar,
  } = useShiftCalendar(studioId, orchestrationQueryParams, { enabled: true });

  const handleSummaryDateRangeChange = useCallback((range: DateRange | undefined) => {
    const fallbackFrom = toLocalDateInputValue(new Date());
    const nextFrom = range?.from ? toLocalDateInputValue(range.from) : fallbackFrom;
    const nextTo = range?.to
      ? toLocalDateInputValue(range.to)
      : toLocalDateInputValue(addDays(fromLocalDateInput(nextFrom), SUMMARY_RANGE_DAYS));

    setPlanningDateFrom(nextFrom);
    setPlanningDateTo(nextTo);
  }, []);

  const handleResetPlanningRange = useCallback(() => {
    const nextRange = getDefaultSummaryPlanningRange();
    setPlanningDateFrom(nextRange.from);
    setPlanningDateTo(nextRange.to);
  }, []);

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
            setDate={handleSummaryDateRangeChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetPlanningRange}
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

  const viewMode = search.view;

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

  const handleToggleView = (mode: 'calendar' | 'table') => {
    updateSearch((prev) => {
      if (mode === 'calendar') {
        return toCalendarViewSearch();
      }
      return toTableViewSearch(prev);
    }, { replace: false });
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Studio Shift Schedule</h1>
          <p className="text-muted-foreground">Plan and manage upcoming studio shifts.</p>
        </div>

        <div className="inline-flex rounded-md border bg-background p-1 shrink-0">
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
      </div>

      <div className="grid gap-4">
        <ShiftCostSnapshotCard studioId={studioId} />
      </div>

      {viewMode === 'calendar'
        ? (
            <StudioShiftsCalendar studioId={studioId} />
          )
        : (
            <StudioShiftsTable
              studioId={studioId}
              isStudioAdmin
              search={search}
              updateSearch={updateSearch}
            />
          )}
    </div>
  );
}
