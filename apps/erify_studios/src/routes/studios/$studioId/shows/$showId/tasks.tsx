import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ListTodo, Trash2, UserRound } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@eridu/ui';

import { AdminTable } from '@/features/admin/components/admin-table';
import { useMembershipsQuery } from '@/features/memberships/api/get-memberships';
import { BulkTaskGenerationDialog } from '@/features/shows/components/bulk-task-generation-dialog';
import { ShowAssignmentDialog } from '@/features/shows/components/show-assignment-dialog';
import type { ShowSelection } from '@/features/studio-shows/api/get-studio-shows';
import { getColumns } from '@/features/studio-shows/components/show-tasks-table/columns';
import { useShowTasks } from '@/features/studio-shows/hooks/use-show-tasks';
import { DeleteTasksDialog } from '@/features/tasks/components/delete-tasks-dialog';
import { useAssignTask } from '@/features/tasks/hooks/use-assign-task';
import { useDeleteTasks } from '@/features/tasks/hooks/use-delete-tasks';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/tasks')({
  component: StudioShowTasksPage,
});

function StudioShowTasksPage() {
  const { studioId, showId } = Route.useParams();
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // 1. Fetch data
  const {
    data: tasks,
    isLoading: isLoadingTasks,
    refetch: refetchTasks,
  } = useShowTasks({ studioId, showId });
  const { data: membersResponse, isLoading: isLoadingMembers } = useMembershipsQuery({
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
      name: tasks?.[0]?.show?.name ?? `Show ${showId}`,
      task_summary: {
        total: totalCount,
        assigned: assignedCount,
        unassigned: Math.max(totalCount - assignedCount, 0),
        completed: completedCount,
      },
    };
  }, [showId, tasks]);

  const handleDeleteSelected = () => {
    if (selectedUids.length > 0) {
      deleteTasks(selectedUids);
    }
  };

  // 3. Define the columns
  const columns = useMemo(
    () => getColumns(members, handleAssign, isAssigning),
    [members, handleAssign, isAssigning],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/studios/$studioId/shows" params={{ studioId }}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Show Tasks</h1>
            <p className="text-sm text-muted-foreground">Manage and assign specific tasks for this show.</p>
          </div>
        </div>
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
