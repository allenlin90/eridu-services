import { createFileRoute } from '@tanstack/react-router';

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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header - scrolls normally */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Task Templates</h1>
        <p className="text-muted-foreground">
          Manage templates for standardizing task creation across your studio.
        </p>
      </div>

      {/* Toolbar - sticky with backdrop blur */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <TaskTemplatesToolbar
          tableState={tableState}
          onRefresh={refetch}
          isRefreshing={isFetching}
          studioId={studioId}
        />
      </div>

      {/* List - scrolls */}
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
  );
}
