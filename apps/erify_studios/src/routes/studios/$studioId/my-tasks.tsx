import { createFileRoute } from '@tanstack/react-router';

import { PageLayout } from '@/components/layouts/page-layout';

export const Route = createFileRoute('/studios/$studioId/my-tasks')({
  component: MyTasksPage,
});

function MyTasksPage() {
  const { studioId } = Route.useParams();

  return (
    <PageLayout
      title="My Tasks"
      description={`Your assigned tasks in studio ${studioId}`}
    >
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Task list coming soon...
        </p>
      </div>
    </PageLayout>
  );
}
