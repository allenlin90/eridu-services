import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

export const Route = createFileRoute('/studios/$studioId/shows')({
  component: RouteComponent,
});

function RouteComponent() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="shows"
      deniedTitle="Shows Access Required"
      deniedDescription="Only studio admins can access shows management."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
