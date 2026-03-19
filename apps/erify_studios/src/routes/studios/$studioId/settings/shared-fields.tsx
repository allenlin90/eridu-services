import { createFileRoute } from '@tanstack/react-router';

import { PageLayout } from '@/components/layouts/page-layout';
import { StudioSharedFieldsSettings } from '@/features/studio-shared-fields/components/studio-shared-fields-settings';

export const Route = createFileRoute('/studios/$studioId/settings/shared-fields')({
  component: StudioSharedFieldsSettingsPage,
});

function StudioSharedFieldsSettingsPage() {
  const { studioId } = Route.useParams();

  return (
    <PageLayout
      title="Shared Fields"
      description="Manage canonical shared fields used for cross-template report merging."
    >
      <StudioSharedFieldsSettings studioId={studioId} />
    </PageLayout>
  );
}
