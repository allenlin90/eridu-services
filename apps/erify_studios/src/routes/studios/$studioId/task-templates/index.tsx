import { createFileRoute } from '@tanstack/react-router';

import { PageLayout } from '@/components/layouts/page-layout';
import { TaskTemplateList } from '@/features/task-templates/components/task-template-list';
import { TaskTemplatesToolbar } from '@/features/task-templates/components/task-templates-toolbar';
import { useTaskTemplates } from '@/features/task-templates/hooks/use-task-templates';

export const Route = createFileRoute('/studios/$studioId/task-templates/')({
  component: TaskTemplatesPage,
});

function TaskTemplatesPage() {
  const { studioId } = Route.useParams();
  const {
    tableState,
    templates,
    isLoading,
    isError,
    isFetching,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useTaskTemplates({ studioId });

  return (
    <PageLayout
      title="Task Templates"
      description="Manage templates for standardizing task creation across your studio."
    >
      <div className="space-y-4">
        <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/60">
          <TaskTemplatesToolbar
            tableState={tableState}
            onRefresh={refetch}
            isRefreshing={isFetching}
            studioId={studioId}
          />
        </div>

        <TaskTemplateList
          templates={templates}
          isLoading={isLoading}
          isError={isError}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          studioId={studioId}
        />
      </div>
    </PageLayout>
  );
}
