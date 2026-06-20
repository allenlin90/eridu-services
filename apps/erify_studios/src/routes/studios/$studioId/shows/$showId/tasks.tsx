import { createFileRoute, useLocation } from '@tanstack/react-router';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { getStudioMembers, studioMemberKeys } from '@/features/studio-members/api/members';
import { getShowTasks, showTasksKeys } from '@/features/studio-shows/api/get-show-tasks';
import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import { getStudioShow, studioShowKeys } from '@/features/studio-shows/api/get-studio-show';
import { TasksDialogs } from '@/features/tasks/components/studio-show-tasks-page/tasks-dialogs';
import { TasksTableSection } from '@/features/tasks/components/studio-show-tasks-page/tasks-table-section';
import { TasksToolbarActions } from '@/features/tasks/components/studio-show-tasks-page/tasks-toolbar-actions';
import { useStudioShowTasksPageController } from '@/features/tasks/hooks/use-studio-show-tasks-page-controller';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/tasks')({
  component: ShowTasksRouteComponent,
  loader: ({ context: { queryClient }, params: { studioId, showId } }) => {
    void queryClient.prefetchQuery({
      queryKey: showTasksKeys.list(studioId, showId),
      queryFn: ({ signal }) => getShowTasks(studioId, showId, { signal }),
    });
    void queryClient.prefetchQuery({
      queryKey: studioShowKeys.detail(studioId, showId),
      queryFn: ({ signal }) => getStudioShow(studioId, showId, { signal }),
    });
    // Key must stay structurally identical to the params object in useStudioMembers
    // when memberSearch is empty ('') — i.e. { limit: 50 } (search omitted ≡ search: undefined).
    void queryClient.prefetchQuery({
      queryKey: studioMemberKeys.list(studioId, { limit: 50 }),
      queryFn: ({ signal }) => getStudioMembers(studioId, { limit: 50 }, { signal }),
    });
  },
});

function ShowTasksRouteComponent() {
  const { studioId } = Route.useParams();
  return (
    <StudioRouteGuard studioId={studioId} routeKey="showTasks">
      <StudioShowTasksTab />
    </StudioRouteGuard>
  );
}

function StudioShowTasksTab() {
  const { studioId, showId } = Route.useParams();
  const location = useLocation();
  const showFromNavigation = (location.state as { show?: StudioShowDetail } | undefined)?.show ?? null;

  const {
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
      <TasksTableSection
        {...tableProps}
        renderToolbarActions={() => <TasksToolbarActions {...toolbarActionsProps} />}
      />

      <TasksDialogs {...dialogsProps} />
    </div>
  );
}
