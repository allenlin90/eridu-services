import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { studioTaskSearchSchema } from '@/features/tasks/config/studio-task-search-schema';

export const Route = createFileRoute('/studios/$studioId/review-queue')({
  component: StudioReviewQueueLayout,
  validateSearch: (search) => studioTaskSearchSchema.parse(search),
});

function StudioReviewQueueLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="reviewQueue"
      deniedTitle="Review Queue Access Required"
      deniedDescription="Only studio managers and admins can access the review queue."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
