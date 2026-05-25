import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';
import { studioTaskSearchSchema } from '@/features/tasks/config/studio-task-search-schema';
import { operationalWindowToDayRange } from '@/lib/operational-day-range';

function parseSearchParamDate(value: string | undefined, isEnd = false): Date | undefined {
  if (!value)
    return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = fromLocalDateInput(value);
    if (isEnd) {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  }
  return new Date(value);
}

export const Route = createFileRoute('/studios/$studioId/task-review')({
  component: StudioTaskReviewLayout,
  validateSearch: (search) => {
    const parsed = studioTaskSearchSchema.parse(search);

    // Default to current operational day range only if BOTH boundaries are missing
    if (!parsed.due_date_from && !parsed.due_date_to) {
      const defaultRange = operationalWindowToDayRange(undefined);
      return {
        ...parsed,
        due_date_from: defaultRange.windowStart.toISOString(),
        due_date_to: defaultRange.windowEnd.toISOString(),
      };
    }

    const fromDate = parseSearchParamDate(parsed.due_date_from, false);
    const toDate = parseSearchParamDate(parsed.due_date_to, true);

    // Normalize boundaries individually if only one is provided (partial selection support)
    const normalizedFrom = fromDate
      ? operationalWindowToDayRange({ from: fromDate, to: fromDate }).windowStart.toISOString()
      : undefined;
    const normalizedTo = toDate
      ? operationalWindowToDayRange({ from: toDate, to: toDate }).windowEnd.toISOString()
      : undefined;

    return {
      ...parsed,
      due_date_from: normalizedFrom,
      due_date_to: normalizedTo,
    };
  },
});

function StudioTaskReviewLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="reviewQueue"
      deniedTitle="Task Review Access Required"
      deniedDescription="Only studio managers and admins can access task review."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
