import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

export const Route = createFileRoute('/studios/$studioId/client-mechanics')({
  component: ClientMechanicsLayout,
});

export function ClientMechanicsLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="clientMechanics"
      deniedTitle="Client Mechanics Access Required"
      deniedDescription="Only studio admins, managers, and account managers can access client mechanics."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
