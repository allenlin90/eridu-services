import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

export const Route = createFileRoute('/studios/$studioId/task-reports')({
  component: StudioTaskReportsLayout,
});

function StudioTaskReportsLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="taskReports"
      deniedTitle="Task Reports Access Required"
      deniedDescription="Only studio moderation managers, managers, and admins can access task reports."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
