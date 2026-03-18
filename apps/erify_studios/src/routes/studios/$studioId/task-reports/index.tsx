import { createFileRoute } from '@tanstack/react-router';

import { PageLayout } from '@/components/layouts/page-layout';
import { TaskReportsIndex } from '@/features/task-reports/components/task-reports-index';
import { useTaskReportsRouteManager } from '@/features/task-reports/hooks/use-task-reports-route-manager';

export const Route = createFileRoute('/studios/$studioId/task-reports/')({
  component: TaskReportsRouteComponent,
  validateSearch: (search: Record<string, unknown>) => search,
});

function TaskReportsRouteComponent() {
  const { studioId } = Route.useParams();
  const searchParams = Route.useSearch();

  // Use a custom hook inside features/ to cleanly manage the view switching.
  const state = useTaskReportsRouteManager(studioId, searchParams);

  return (
    <PageLayout
      title="Task Reports"
      description="Cross-show reporting and export across your studio's tasks."
    >
      <TaskReportsIndex studioId={studioId} {...state} />
    </PageLayout>
  );
}
