import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';
import { studioTaskSearchSchema } from '@/features/tasks/config/studio-task-search-schema';
import { operationalWindowToDayRange } from '@/lib/operational-day-range';

function parseSearchParamDate(value: string | undefined): Date | undefined {
  if (!value)
    return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fromLocalDateInput(value);
  }
  return new Date(value);
}

export const Route = createFileRoute('/studios/$studioId/task-review')({
  component: StudioTaskReviewLayout,
  validateSearch: (search) => {
    const parsed = studioTaskSearchSchema.parse(search);
    const fromDate = parseSearchParamDate(parsed.due_date_from);
    const toDate = parseSearchParamDate(parsed.due_date_to);

    const range = operationalWindowToDayRange(
      fromDate || toDate ? { from: fromDate, to: toDate } : undefined,
    );

    return {
      ...parsed,
      due_date_from: range.windowStart.toISOString(),
      due_date_to: range.windowEnd.toISOString(),
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
