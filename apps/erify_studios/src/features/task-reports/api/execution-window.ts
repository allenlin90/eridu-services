import type { TaskReportExecutionScope, TaskReportScope } from '@eridu/api-types/task-management';

import { buildOperationalDayRange } from '@/lib/operational-day-range';

/**
 * Resolves the studio operational-day window (06:00 -> 05:59 next day, in the
 * user's local timezone) from the scope's calendar dates and attaches it as ISO
 * instants. The BE filters by these verbatim, so day-boundary handling stays on
 * the client and never depends on the server's timezone.
 */
export function withExecutionWindow(scope: TaskReportScope): TaskReportExecutionScope {
  const { windowStart, windowEnd } = buildOperationalDayRange({
    date_from: scope.date_from,
    date_to: scope.date_to,
  });

  return {
    ...scope,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
  };
}
