import { createFileRoute } from '@tanstack/react-router';

import { AdminLayout } from '@/features/admin/components';

export const Route = createFileRoute('/system/shows/$showId/tasks')({
  component: ShowTasks,
});

function ShowTasks() {
  const { showId } = Route.useParams();

  return (
    <AdminLayout
      title={`Tasks for Show ${showId}`}
      description="Manage and assign tasks for this specific show."
    >
      <div className="py-8 text-center text-muted-foreground">
        <p>This is a placeholder for the Show Tasks detail view.</p>
        <p className="text-sm mt-2">Here managers will see all generated tasks for this show and be able to reassign them inline.</p>
      </div>
    </AdminLayout>
  );
}
