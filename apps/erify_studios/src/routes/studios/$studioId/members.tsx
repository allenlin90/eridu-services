import { createFileRoute } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import { StudioHelperRosterManager } from '@/features/memberships/components/studio-helper-roster-manager';

export const Route = createFileRoute('/studios/$studioId/members')({
  component: StudioMembersPage,
});

function StudioMembersPage() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="members"
      deniedTitle="Member Roster Access Required"
      deniedDescription="Only studio admins can manage studio memberships."
    >
      <PageLayout
        title="Member Roster"
        description="Manage studio memberships, roles, and helper eligibility for task assignment."
      >
        <StudioHelperRosterManager studioId={studioId} />
      </PageLayout>
    </StudioRouteGuard>
  );
}
