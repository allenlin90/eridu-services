import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { studioTaskSearchSchema } from '@/features/tasks/config/studio-task-search-schema';

export const Route = createFileRoute('/studios/$studioId/task-review')({
  component: StudioTaskReviewLayout,
  validateSearch: (search) => studioTaskSearchSchema.parse(search),
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
