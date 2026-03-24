import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { studioTaskTemplateSearchSchema } from '@/features/task-templates/config/studio-task-template-search-schema';

export const Route = createFileRoute('/studios/$studioId/task-templates')({
  component: TaskTemplatesLayout,
  validateSearch: (search) => studioTaskTemplateSearchSchema.parse(search),
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
