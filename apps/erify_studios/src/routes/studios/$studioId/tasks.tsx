import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { studioTaskSearchSchema } from '@/features/tasks/config/studio-task-search-schema';

export const Route = createFileRoute('/studios/$studioId/tasks')({
  component: StudioTasksLayout,
  validateSearch: (search) => studioTaskSearchSchema.parse(search),
});

function StudioTasksLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="tasks"
      deniedTitle="Review Queue Access Required"
      deniedDescription="Only studio managers and admins can access the review queue."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
