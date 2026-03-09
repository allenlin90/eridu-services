import { createFileRoute } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { StudioCreatorRosterManager } from '@/features/studio-creator-roster/components/studio-creator-roster-manager';

export const Route = createFileRoute('/studios/$studioId/creators/')({
  component: StudioCreatorsRosterPage,
});

function StudioCreatorsRosterPage() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="creators"
      deniedTitle="Creator Access Required"
      deniedDescription="Only studio admins, managers, and talent managers can manage creators."
    >
      <PageLayout
        title="Creator Roster"
        description="Manage the studio roster before running creator-to-show mapping."
      >
        <StudioCreatorRosterManager studioId={studioId} />
      </PageLayout>
    </StudioRouteGuard>
  );
}
