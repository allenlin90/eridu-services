import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/studios/$studioId/task-templates')({
  component: TaskTemplatesLayout,
});

function TaskTemplatesLayout() {
  return <Outlet />;
}
