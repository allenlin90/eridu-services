import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@eridu/ui';

import { AdminTable } from '@/features/admin/components/admin-table';
import { useMembershipsQuery } from '@/features/memberships/api/get-memberships';
import { getColumns } from '@/features/studio-shows/components/show-tasks-table/columns';
import { useShowTasks } from '@/features/studio-shows/hooks/use-show-tasks';
import { useAssignTask } from '@/features/tasks/hooks/use-assign-task';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/tasks')({
  component: StudioShowTasksPage,
});

function StudioShowTasksPage() {
  const { studioId, showId } = Route.useParams();

  // 1. Fetch data
  const { data: tasks, isLoading: isLoadingTasks } = useShowTasks({ studioId, showId });
  const { data: membersResponse, isLoading: isLoadingMembers } = useMembershipsQuery({
    studio_id: studioId,
    limit: 100, // get enough members to populate the dropdown
  });

  const members = membersResponse?.data || [];

  // 2. Setup Assignment Mutation
  const { mutate: assignTask, isPending: isAssigning } = useAssignTask({ studioId, showId });

  const handleAssign = (taskId: string, assigneeUid: string | null) => {
    assignTask({ taskId, assigneeUid });
  };

  // 3. Define the columns
  const columns = useMemo(
    () => getColumns(members, handleAssign, isAssigning),
    [members, handleAssign, isAssigning],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
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
        />
      </div>
    </div>
  );
}
