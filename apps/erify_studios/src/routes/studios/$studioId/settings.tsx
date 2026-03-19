import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

export const Route = createFileRoute('/studios/$studioId/settings')({
  component: StudioSettingsLayout,
});

function StudioSettingsLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="sharedFields"
      deniedTitle="Studio Settings Access Required"
      deniedDescription="Only studio admins can access shared field settings."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
