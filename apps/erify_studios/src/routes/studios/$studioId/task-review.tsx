import { createFileRoute, Outlet } from '@tanstack/react-router';
import { endOfDay, startOfDay } from 'date-fns';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { studioTaskSearchSchema } from '@/features/tasks/config/studio-task-search-schema';

export const Route = createFileRoute('/studios/$studioId/task-review')({
  component: StudioTaskReviewLayout,
  validateSearch: (search) => {
    const parsed = studioTaskSearchSchema.parse(search);
    const today = new Date();

    return {
      ...parsed,
      due_date_from: parsed.due_date_from ?? startOfDay(today).toISOString(),
      due_date_to: parsed.due_date_to ?? endOfDay(today).toISOString(),
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
