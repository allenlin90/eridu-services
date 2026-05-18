import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

export const Route = createFileRoute('/studios/$studioId/members')({
  component: StudioMembersLayout,
});

function StudioMembersLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="members"
      deniedTitle="Studio Settings Access Required"
      deniedDescription="Only studio admins and managers can access the member roster."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
