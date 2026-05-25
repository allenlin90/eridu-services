import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { studioTaskSearchSchema } from '@/features/tasks/config/studio-task-search-schema';
import { buildOperationalDayRange } from '@/lib/operational-day-range';

export const Route = createFileRoute('/studios/$studioId/task-review')({
  component: StudioTaskReviewLayout,
  validateSearch: (search) => {
    const parsed = studioTaskSearchSchema.parse(search);
    const defaultRange = buildOperationalDayRange({});

    return {
      ...parsed,
      due_date_from: parsed.due_date_from ?? defaultRange.windowStart.toISOString(),
      due_date_to: parsed.due_date_to ?? defaultRange.windowEnd.toISOString(),
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
