import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { studioTaskSearchSchema } from '@/features/tasks/config/studio-task-search-schema';
import { operationalWindowToDayRange } from '@/lib/operational-day-range';

export const Route = createFileRoute('/studios/$studioId/task-review')({
  component: StudioTaskReviewLayout,
  validateSearch: (search) => {
    const parsed = studioTaskSearchSchema.parse(search);
    const fromDate = parsed.due_date_from ? new Date(parsed.due_date_from) : undefined;
    const toDate = parsed.due_date_to ? new Date(parsed.due_date_to) : undefined;

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
