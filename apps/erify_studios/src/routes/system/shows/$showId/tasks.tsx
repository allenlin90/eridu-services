import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnFiltersState } from '@tanstack/react-table';
import { Eye, RotateCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { Button, DropdownMenuItem } from '@eridu/ui';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import { DeleteConfirmDialog } from '@/features/admin/components/delete-confirm-dialog';
import { useDeleteAdminTask } from '@/features/tasks/api/delete-admin-task';
import { adminTasksKeys, getAdminTasks } from '@/features/tasks/api/get-admin-tasks';
import { SystemTaskDetailsDialog } from '@/features/tasks/components/system-task-details-dialog';
import {
  systemTaskColumns,
  systemTaskSearchableColumns,
} from '@/features/tasks/config/system-task-columns';
import { useReassignAdminTask } from '@/features/tasks/hooks/use-reassign-admin-task';
import { useReassignAdminTaskShow } from '@/features/tasks/hooks/use-reassign-admin-task-show';
import { useUpdateAdminTask } from '@/features/tasks/hooks/use-update-admin-task';

export const Route = createFileRoute('/system/shows/$showId/tasks')({
  component: ShowTasks,
});

function ShowTasks() {
  const { showId } = Route.useParams();
  const queryClient = useQueryClient();

  const [selectedTask, setSelectedTask] = useState<TaskWithRelationsDto | null>(null);
  const [deleteTask, setDeleteTask] = useState<TaskWithRelationsDto | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const search = columnFilters.find((filter) => filter.id === 'description')?.value as string | undefined;
  const status = columnFilters.find((filter) => filter.id === 'status')?.value as string | undefined;
  const taskType = columnFilters.find((filter) => filter.id === 'task_type')?.value as string | undefined;

  const params = useMemo(() => ({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    reference_id: showId,
    search,
    status,
    task_type: taskType,
    sort: 'due_date:asc' as const,
  }), [pagination.pageIndex, pagination.pageSize, search, showId, status, taskType]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: adminTasksKeys.list(params),
    queryFn: () => getAdminTasks(params),
    staleTime: 60 * 1000,
    gcTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const reassignMutation = useReassignAdminTask();
  const reassignShowMutation = useReassignAdminTaskShow();
  const deleteMutation = useDeleteAdminTask();
  const updateMutation = useUpdateAdminTask();

  const handleAssign = async (taskId: string, assigneeUid: string | null) => {
    await reassignMutation.mutateAsync({
      taskId,
      data: { assignee_uid: assigneeUid },
    });
  };

  const handleDelete = async () => {
    if (!deleteTask) {
      return;
    }

    await deleteMutation.mutateAsync(deleteTask.id);
    setDeleteTask(null);
  };

  const handleReassignShow = async (taskId: string, targetShowUid: string) => {
    await reassignShowMutation.mutateAsync({
      taskId,
      data: { show_uid: targetShowUid },
    });
  };

  const handleUpdateDueDate = async (taskId: string, dueDate: string | null, version: number) => {
    await updateMutation.mutateAsync({
      taskId,
      data: {
        version,
        due_date: dueDate,
      },
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: adminTasksKeys.all });
  };

  return (
    <AdminLayout
      title={`Tasks for Show ${showId}`}
      description="System-admin scoped task operations for this show."
      onRefresh={handleRefresh}
      refreshQueryKey={adminTasksKeys.all}
    >
      <AdminTable
        data={data?.data || []}
        columns={systemTaskColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No tasks found for this show."
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        searchableColumns={systemTaskSearchableColumns}
        searchColumn="description"
        searchPlaceholder="Search by task, assignee..."
        featuredFilterColumns={['status', 'task_type', 'due_date']}
        onDelete={(task) => setDeleteTask(task)}
        renderExtraActions={(task) => (
          <DropdownMenuItem onClick={() => setSelectedTask(task)}>
            <Eye className="mr-2 h-4 w-4" />
            View details
          </DropdownMenuItem>
        )}
        renderToolbarActions={() => (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full sm:w-auto"
            onClick={handleRefresh}
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        )}
        pagination={{
          pageIndex: (data?.meta.page ?? 1) - 1,
          pageSize: data?.meta.limit ?? pagination.pageSize,
          total: data?.meta.total ?? 0,
          pageCount: data?.meta.totalPages ?? 0,
        }}
        onPaginationChange={setPagination}
      />

      <SystemTaskDetailsDialog
        key={selectedTask?.id ?? 'empty'}
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onAssign={handleAssign}
        isAssigning={reassignMutation.isPending}
        onReassignShow={handleReassignShow}
        isReassigningShow={reassignShowMutation.isPending}
        onUpdateDueDate={handleUpdateDueDate}
        isUpdatingDueDate={updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={!!deleteTask}
        onOpenChange={(open) => !open && setDeleteTask(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        description={`This will delete task "${deleteTask?.description ?? ''}". This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
