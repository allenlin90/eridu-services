import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import * as m from '@/paraglide/messages';

export const Route = createFileRoute('/studios/$studioId/scene-review')({
  component: SceneReviewLayout,
});

function SceneReviewLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="sceneReview"
      deniedTitle={m.scene_review_access_title()}
      deniedDescription={m.scene_review_access_description()}
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
