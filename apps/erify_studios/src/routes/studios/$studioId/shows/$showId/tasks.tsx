import { createFileRoute, useLocation } from '@tanstack/react-router';

import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import { ShowHeaderSection } from '@/features/tasks/components/studio-show-tasks-page/show-header-section';
import { TasksDialogs } from '@/features/tasks/components/studio-show-tasks-page/tasks-dialogs';
import { TasksTableSection } from '@/features/tasks/components/studio-show-tasks-page/tasks-table-section';
import { TasksToolbarActions } from '@/features/tasks/components/studio-show-tasks-page/tasks-toolbar-actions';
import { useStudioShowTasksPageController } from '@/features/tasks/hooks/use-studio-show-tasks-page-controller';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/tasks')({
  component: StudioShowTasksPage,
});

function StudioShowTasksPage() {
  const { studioId, showId } = Route.useParams();
  const location = useLocation();
  const showFromNavigation = (location.state as { show?: StudioShowDetail } | undefined)?.show ?? null;

  const {
    headerProps,
    tableProps,
    toolbarActionsProps,
    dialogsProps,
  } = useStudioShowTasksPageController({
    studioId,
    showId,
    showFromNavigation,
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-2">
      {/* Header */}
      <ShowHeaderSection {...headerProps} />

      <TasksTableSection
        {...tableProps}
        renderToolbarActions={() => <TasksToolbarActions {...toolbarActionsProps} />}
      />

      <TasksDialogs {...dialogsProps} />
    </div>
  );
}
