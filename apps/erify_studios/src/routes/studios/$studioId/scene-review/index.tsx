import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { UserCog } from 'lucide-react';
import { useCallback } from 'react';

import { Button } from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import { SceneReviewWorkspace } from '@/features/scene-review/components/scene-review-workspace';
import {
  type SceneReviewSearch,
  sceneReviewSearchSchema,
} from '@/features/scene-review/config/scene-review-search-schema';
import { useSceneReviewPage } from '@/features/scene-review/hooks/use-scene-review-page';
import * as m from '@/paraglide/messages';

const sceneReviewIndexRouteApi = getRouteApi('/studios/$studioId/scene-review/');

function StudioSceneReviewPage() {
  const { studioId } = sceneReviewIndexRouteApi.useParams();
  const search = sceneReviewIndexRouteApi.useSearch();
  const navigate = sceneReviewIndexRouteApi.useNavigate();
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
    <PageLayout
      title={m.scene_review_title()}
      description={m.scene_review_description()}
      actions={(
        <Button asChild variant="outline" size="sm">
          <Link to="/studios/$studioId/scene-review/profiles" params={{ studioId }}>
            <UserCog className="mr-2 h-4 w-4" />
            {m.scene_profiles_manage_action()}
          </Link>
        </Button>
      )}
    >
      <SceneReviewWorkspace studioId={studioId} search={search} controller={controller} />
    </PageLayout>
  );
}

export const Route = createFileRoute('/studios/$studioId/scene-review/')({
  component: StudioSceneReviewPage,
  validateSearch: (search) => sceneReviewSearchSchema.parse(search),
});
