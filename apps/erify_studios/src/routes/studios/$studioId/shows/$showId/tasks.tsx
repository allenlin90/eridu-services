import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ArrowLeft, ListTodo, RotateCw, Trash2, UserRound } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Badge, Button } from '@eridu/ui';

import { AdminTable } from '@/features/admin/components/admin-table';
import { useMembershipsQuery } from '@/features/memberships/api/get-memberships';
import { BulkTaskGenerationDialog } from '@/features/shows/components/bulk-task-generation-dialog';
import { ShowAssignmentDialog } from '@/features/shows/components/show-assignment-dialog';
import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import type { ShowSelection, StudioShow } from '@/features/studio-shows/api/get-studio-shows';
import { studioShowsKeys } from '@/features/studio-shows/api/get-studio-shows';
import { getColumns } from '@/features/studio-shows/components/show-tasks-table/columns';
import { useShowTasks } from '@/features/studio-shows/hooks/use-show-tasks';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';
import { DeleteTasksDialog } from '@/features/tasks/components/delete-tasks-dialog';
import { useAssignTask } from '@/features/tasks/hooks/use-assign-task';
import { useDeleteTasks } from '@/features/tasks/hooks/use-delete-tasks';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/tasks')({
  component: StudioShowTasksPage,
});

function StudioShowTasksPage() {
  const { studioId, showId } = Route.useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // 1. Fetch data
  const showFromNavigation = (location.state as { show?: StudioShowDetail } | undefined)?.show ?? null;
  const showFromStudioShowsCache = useMemo(() => {
    const cachedLists = queryClient.getQueriesData<{ data: StudioShow[] }>({
      queryKey: studioShowsKeys.listPrefix(studioId),
    });

    for (const [, cached] of cachedLists) {
      const cachedShow = cached?.data?.find((show) => show.id === showId);
      if (cachedShow) {
        return cachedShow as StudioShowDetail;
      }
    }

    return null;
  }, [queryClient, showId, studioId]);
  const initialShowDetails = showFromNavigation ?? showFromStudioShowsCache;
  const initialShowDetailsUpdatedAt = useMemo(() => {
    const cachedLists = queryClient.getQueryCache().findAll({
      queryKey: studioShowsKeys.listPrefix(studioId),
    });

    for (const query of cachedLists) {
      const cached = query.state.data as { data?: StudioShow[] } | undefined;
      const hasCurrentShow = cached?.data?.some((show) => show.id === showId);
      if (hasCurrentShow) {
        return query.state.dataUpdatedAt;
      }
    }

    return null;
  }, [queryClient, showId, studioId]);

  const {
    data: tasks,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks,
    refetch: refetchTasks,
  } = useShowTasks({ studioId, showId });
  const {
    data: showDetails,
    isLoading: isLoadingShow,
    isFetching: isFetchingShow,
    refetch: refetchShow,
  } = useStudioShow({
    studioId,
    showId,
    initialData: initialShowDetails ?? undefined,
    initialDataUpdatedAt: initialShowDetailsUpdatedAt ?? undefined,
  });
  const {
    data: membersResponse,
    isLoading: isLoadingMembers,
    isFetching: isFetchingMembers,
    refetch: refetchMembers,
  } = useMembershipsQuery({
    studio_id: studioId,
    limit: 100, // get enough members to populate the dropdown
  });

  const rawMembers = membersResponse?.data;
  const members = useMemo(() => rawMembers || [], [rawMembers]);

  // 2. Setup Mutations
  const { mutate: assignTask, isPending: isAssigning } = useAssignTask({ studioId, showId });
  const { mutate: deleteTasks, isPending: isDeleting } = useDeleteTasks({
    studioId,
    showId,
    onSuccess: () => {
      setRowSelection({});
      setIsDeleteDialogOpen(false);
    },
  });

  const handleAssign = useCallback((taskId: string, assigneeUid: string | null) => {
    assignTask({ taskId, assigneeUid });
  }, [assignTask]);

  const selectedUids = useMemo(() => {
    return Object.entries(rowSelection)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);
  }, [rowSelection]);
  const selectedCount = selectedUids.length;
  const currentShow = useMemo<ShowSelection>(() => {
    const assignedCount = (tasks ?? []).filter((task) => task.assignee !== null).length;
    const completedCount = (tasks ?? []).filter((task) => task.status === 'COMPLETED').length;
    const totalCount = tasks?.length ?? 0;
    return {
      id: showId,
      name: showDetails?.name ?? tasks?.[0]?.show?.name ?? `Show ${showId}`,
      task_summary: {
        total: totalCount,
        assigned: assignedCount,
        unassigned: Math.max(totalCount - assignedCount, 0),
        completed: completedCount,
      },
    };
  }, [showId, showDetails?.name, tasks]);

  const handleDeleteSelected = () => {
    if (selectedUids.length > 0) {
      deleteTasks(selectedUids);
    }
  };

  const isRefreshing = isFetchingTasks || isFetchingShow || isFetchingMembers;
  const handleRefreshAll = useCallback(async () => {
    await Promise.all([refetchTasks(), refetchShow(), refetchMembers()]);
  }, [refetchMembers, refetchShow, refetchTasks]);

  // 3. Define the columns
  const columns = useMemo(
    () => getColumns(members, handleAssign, isAssigning),
    [members, handleAssign, isAssigning],
  );
  const showMetaItems = useMemo(() => {
    if (!showDetails) {
      return [];
    }

    return [
      { label: 'Show ID', value: showDetails.id },
      { label: 'Studio', value: showDetails.studio_name ?? '—' },
      { label: 'Room', value: showDetails.studio_room_name ?? '—' },
      { label: 'Type', value: showDetails.show_type_name ?? '—' },
      { label: 'Standard', value: showDetails.show_standard_name ?? '—' },
    ];
  }, [showDetails]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/studios/$studioId/shows" params={{ studioId }}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {isLoadingShow && !showDetails ? 'Loading show...' : (showDetails?.name ?? 'Show Tasks')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {showDetails
                  ? `${showDetails.client_name ?? 'No client'} • ${format(new Date(showDetails.start_time), 'PPP p')} - ${format(new Date(showDetails.end_time), 'p')}`
                  : 'Manage and assign specific tasks for this show.'}
              </p>
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {showDetails.show_status_name && (
                <Badge variant="outline" className="capitalize">
                  {showDetails.show_status_name}
                </Badge>
              )}
              {showDetails.show_type_name && (
                <Badge variant="secondary" className="capitalize">
                  {showDetails.show_type_name}
                </Badge>
              )}
              {showDetails.show_standard_name && (
                <Badge variant="outline" className="capitalize">
                  {showDetails.show_standard_name}
                </Badge>
              )}
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
              {showMetaItems.map((item) => (
                <div key={item.label} className="rounded border bg-background px-2 py-1.5">
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="truncate font-medium" title={item.value}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      <div className="flex-1 mt-4">
        {/* We use AdminTable since it already handles sorting, filtering, empty messages, etc. */}
        <AdminTable
          data={tasks || []}
          columns={columns}
          isLoading={isLoadingTasks || isLoadingMembers}
          emptyMessage="No tasks generated for this show yet."
          searchColumn="description"
          searchableColumns={[{ id: 'description', title: 'Task Description' }]}
          searchPlaceholder="Search tasks..."
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(task) => task.id}
          renderToolbarActions={() => (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full sm:w-auto"
                onClick={handleRefreshAll}
                disabled={isRefreshing}
              >
                <RotateCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full sm:w-auto"
                onClick={() => setIsGenerateDialogOpen(true)}
              >
                <ListTodo className="mr-2 h-4 w-4" />
                Generate Tasks
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full sm:w-auto"
                onClick={() => setIsAssignDialogOpen(true)}
              >
                <UserRound className="mr-2 h-4 w-4" />
                Assign All Tasks
              </Button>
              {selectedCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 w-full sm:w-auto"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected (
                  {selectedCount}
                  )
                </Button>
              )}
            </div>
          )}
        />
      </div>

      <DeleteTasksDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        count={selectedCount}
        isLoading={isDeleting}
      />

      <BulkTaskGenerationDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        shows={[currentShow]}
        onSuccess={() => {
          void refetchTasks();
        }}
      />

      <ShowAssignmentDialog
        studioId={studioId}
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        shows={[currentShow]}
        onSuccess={() => {
          void refetchTasks();
        }}
      />
    </div>
  );
}
