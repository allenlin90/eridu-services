import { createFileRoute } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { StudioSharedFieldsSettings } from '@/features/studio-shared-fields/components/studio-shared-fields-settings';

export const Route = createFileRoute('/studios/$studioId/shared-fields')({
  component: StudioSharedFieldsSettingsPage,
});

function StudioSharedFieldsSettingsPage() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="sharedFields"
      deniedTitle="Studio Settings Access Required"
      deniedDescription="Only studio admins can access shared field settings."
    >
      <PageLayout
        title="Shared Fields"
        description="Manage canonical shared fields used for cross-template report merging."
      >
        <StudioSharedFieldsSettings studioId={studioId} />
      </PageLayout>
    </StudioRouteGuard>
  );
}
