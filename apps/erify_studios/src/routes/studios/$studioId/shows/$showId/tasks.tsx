import { createFileRoute, useLocation } from '@tanstack/react-router';

import { getStudioMemberships } from '@/features/memberships/api/get-studio-memberships';
import { getShowTasks, showTasksKeys } from '@/features/studio-shows/api/get-show-tasks';
import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import { getStudioShow, studioShowKeys } from '@/features/studio-shows/api/get-studio-show';
import { ShowHeaderSection } from '@/features/tasks/components/studio-show-tasks-page/show-header-section';
import { TasksDialogs } from '@/features/tasks/components/studio-show-tasks-page/tasks-dialogs';
import { TasksTableSection } from '@/features/tasks/components/studio-show-tasks-page/tasks-table-section';
import { TasksToolbarActions } from '@/features/tasks/components/studio-show-tasks-page/tasks-toolbar-actions';
import { useStudioShowTasksPageController } from '@/features/tasks/hooks/use-studio-show-tasks-page-controller';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/tasks')({
  component: StudioShowTasksPage,
  loader: ({ context: { queryClient }, params: { studioId, showId } }) => {
    void queryClient.prefetchQuery({
      queryKey: showTasksKeys.list(studioId, showId),
      queryFn: ({ signal }) => getShowTasks(studioId, showId, { signal }),
    });
    void queryClient.prefetchQuery({
      queryKey: studioShowKeys.detail(studioId, showId),
      queryFn: ({ signal }) => getStudioShow(studioId, showId, { signal }),
    });
    // Key must stay structurally identical to the params object in useStudioMembershipsQuery
    // when memberSearch is empty ('') — i.e. { limit: 50 } (name omitted ≡ name: undefined after TQ normalization).
    void queryClient.prefetchQuery({
      queryKey: ['studio-memberships', 'list', studioId, { limit: 50 }],
      queryFn: ({ signal }) => getStudioMemberships(studioId, { limit: 50 }, { signal }),
    });
  },
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
    <div className="space-y-4">
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
