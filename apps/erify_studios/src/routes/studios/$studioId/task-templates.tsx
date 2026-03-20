import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';

export const Route = createFileRoute('/studios/$studioId/task-templates')({
  component: TaskTemplatesLayout,
});

function TaskTemplatesLayout() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="taskTemplates"
      deniedTitle="Task Templates Access Required"
      deniedDescription="Only studio admins and managers can access task templates."
    >
      <Outlet />
    </StudioRouteGuard>
  );
}
