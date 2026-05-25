import { createFileRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

const operationsReviewSearchSchema = z.object({
  range: z.enum(['today', 'yesterday', 'last_7_days', 'custom']).catch('today'),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/operations-review')({
  component: StudioOperationsReviewRoute,
  validateSearch: (search) => operationsReviewSearchSchema.parse(search),
});

function StudioOperationsReviewRoute() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="operationsReview"
      deniedTitle="Operations Review Access Required"
      deniedDescription="Only studio managers and admins can access operations review."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
