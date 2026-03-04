import type { CalendarApp } from '@schedule-x/calendar';
import { ScheduleXCalendar } from '@schedule-x/react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

type ShiftCalendarCardProps = {
  isLoading: boolean;
  isFetching: boolean;
  shiftCount: number;
  calendarApp: CalendarApp | null;
};

export function ShiftCalendarCard({
  isLoading,
  isFetching,
  shiftCount,
  calendarApp,
}: ShiftCalendarCardProps) {
  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Schedule Calendar</CardTitle>
        <CardDescription>
          Month, week, and day calendar view for all studio shifts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(isLoading || isFetching)
          ? (
              <p className="text-sm text-muted-foreground">Loading shifts...</p>
            )
          : shiftCount === 0
            ? (
                <p className="text-sm text-muted-foreground">No shifts scheduled yet.</p>
              )
            : (
                <>
                  <div className="rounded-lg border bg-card p-2 shadow-sm">
                    <ScheduleXCalendar calendarApp={calendarApp} />
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
                  </div>
                </>
              )}
      </CardContent>
    </Card>
  );
}
