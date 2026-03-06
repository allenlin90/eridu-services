import 'temporal-polyfill/global';

import type { CalendarApp } from '@schedule-x/calendar';
import { ScheduleXCalendar } from '@schedule-x/react';
import { Loader2, RefreshCw } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@eridu/ui';

type ShiftCalendarCardProps = {
  isLoading: boolean;
  isFetching: boolean;
  shiftCount: number;
  calendarApp: CalendarApp | null;
  dateRange: { date_from: string; date_to: string } | null;
  onRefresh: () => void;
};

const CALENDAR_SKELETON_ROW_IDS = [
  'calendar-skeleton-row-1',
  'calendar-skeleton-row-2',
  'calendar-skeleton-row-3',
  'calendar-skeleton-row-4',
  'calendar-skeleton-row-5',
  'calendar-skeleton-row-6',
  'calendar-skeleton-row-7',
  'calendar-skeleton-row-8',
] as const;

export function ShiftCalendarCard({
  isLoading,
  isFetching,
  shiftCount,
  calendarApp,
  dateRange,
  onRefresh,
}: ShiftCalendarCardProps) {
  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Shift Calendar</CardTitle>
        <CardDescription>
          Calendar view of all shift blocks. Duty manager blocks are highlighted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <p>
            {dateRange
              ? `Range: ${dateRange.date_from} to ${dateRange.date_to}`
              : 'Range: loading calendar window...'}
            {' | '}
            {shiftCount}
            {' '}
            block
            {shiftCount === 1 ? '' : 's'}
          </p>
          <div className="inline-flex items-center gap-2">
            {isFetching && (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="min-h-[680px] rounded-lg border bg-card p-2 shadow-sm">
          {calendarApp
            ? <ScheduleXCalendar calendarApp={calendarApp} />
            : (
                <div className="space-y-3 p-4">
                  {isLoading && <p className="text-sm text-muted-foreground">Loading shift calendar...</p>}
                  {CALENDAR_SKELETON_ROW_IDS.map((rowId) => (
                    <Skeleton key={rowId} className="h-14 w-full" />
                  ))}
                </div>
              )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-700" />
            Shift
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-700" />
            Duty Manager
          </span>
          {shiftCount === 0 && calendarApp && (
            <span>No shifts in the current range.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
