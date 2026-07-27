import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { useCallback } from 'react';

import { PageLayout } from '@/components/layouts/page-layout';
import { SceneProfileManager } from '@/features/scene-qc/components/scene-profile-manager';
import { sceneProfileSearchSchema } from '@/features/scene-qc/config/scene-profile-search-schema';
import * as m from '@/paraglide/messages';

const sceneProfilesRouteApi = getRouteApi('/studios/$studioId/scene-review/profiles');

function SceneProfilesPage() {
  const { studioId } = sceneProfilesRouteApi.useParams();
  const { client_id: clientId } = sceneProfilesRouteApi.useSearch();
  const navigate = sceneProfilesRouteApi.useNavigate();
  const setClientId = useCallback((next?: string) => {
    void navigate({ search: (prev) => ({ ...prev, client_id: next }), replace: true });
  }, [navigate]);

  return (
    <PageLayout title={m.scene_profiles_title()} description={m.scene_profiles_description()}>
      <SceneProfileManager studioId={studioId} clientId={clientId} onClientChange={setClientId} />
    </PageLayout>
  );
}

export const Route = createFileRoute('/studios/$studioId/scene-review/profiles')({
  component: SceneProfilesPage,
  validateSearch: (search) => sceneProfileSearchSchema.parse(search),
});
