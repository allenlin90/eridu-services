import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

export const Route = createFileRoute('/studios/$studioId/creators')({
  component: StudioCreatorsLayout,
});

function StudioCreatorsLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="creatorRoster"
      deniedTitle="Creator Roster Access Required"
      deniedDescription="Only studio admins, managers, and talent managers can access the creator roster."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
