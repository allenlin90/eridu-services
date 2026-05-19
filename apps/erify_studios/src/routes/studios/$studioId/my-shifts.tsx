import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

export const Route = createFileRoute('/studios/$studioId/my-shifts')({
  component: MyShiftsLayout,
});

function MyShiftsLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="myShifts"
      deniedTitle="My Shifts Access Required"
      deniedDescription="You must be a member of this studio to view personal shifts."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
