import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { SceneReviewWorkspace } from '@/features/scene-review/components/scene-review-workspace';
import {
  type SceneReviewSearch,
  sceneReviewSearchSchema,
} from '@/features/scene-review/config/scene-review-search-schema';
import { useSceneReviewPage } from '@/features/scene-review/hooks/use-scene-review-page';
import * as m from '@/paraglide/messages';

export const Route = createFileRoute('/studios/$studioId/scene-review')({
  component: StudioSceneReviewPage,
  validateSearch: (search) => sceneReviewSearchSchema.parse(search),
});

function StudioSceneReviewPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const updateSearch = useCallback((next: Partial<SceneReviewSearch>) => {
    void navigate({
      search: (previous) => ({ ...previous, ...next }),
      replace: true,
    });
  }, [navigate]);
  const controller = useSceneReviewPage({
    studioId,
    search,
    onSearchChange: updateSearch,
  });

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="sceneReview"
      deniedTitle={m.scene_review_access_title()}
      deniedDescription={m.scene_review_access_description()}
    >
      <PageLayout title={m.scene_review_title()} description={m.scene_review_description()}>
        <SceneReviewWorkspace studioId={studioId} search={search} controller={controller} />
      </PageLayout>
    </StudioRouteGuard>
  );
}
