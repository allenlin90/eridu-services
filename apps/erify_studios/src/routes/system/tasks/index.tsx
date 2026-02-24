import { createFileRoute } from '@tanstack/react-router';
import { Eye } from 'lucide-react';
import { useState } from 'react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { DropdownMenuItem } from '@eridu/ui';

import { AdminLayout, AdminTable } from '@/features/admin/components';
import { DeleteConfirmDialog } from '@/features/admin/components/delete-confirm-dialog';
import { useDeleteAdminTask } from '@/features/tasks/api/delete-admin-task';
import { useReassignAdminTask } from '@/features/tasks/api/reassign-admin-task';
import { useReassignAdminTaskShow } from '@/features/tasks/api/reassign-admin-task-show';
import { SystemTaskDetailsDialog } from '@/features/tasks/components/system-task-details-dialog';
import {
  systemTaskColumns,
  systemTaskSearchableColumns,
} from '@/features/tasks/config/system-task-columns';
import { systemTaskSearchSchema } from '@/features/tasks/config/system-task-search-schema';
import { useAdminTasks } from '@/features/tasks/hooks/use-admin-tasks';

export const Route = createFileRoute('/system/tasks/')({
  component: SystemTasksList,
  validateSearch: (search) => systemTaskSearchSchema.parse(search),
});

function SystemTasksList() {
  const [selectedTask, setSelectedTask] = useState<TaskWithRelationsDto | null>(null);
  const [deleteTask, setDeleteTask] = useState<TaskWithRelationsDto | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  } = useAdminTasks();
  const reassignMutation = useReassignAdminTask();
  const reassignShowMutation = useReassignAdminTaskShow();
  const deleteMutation = useDeleteAdminTask();

  const handleAssign = async (taskId: string, assigneeUid: string | null) => {
    await reassignMutation.mutateAsync({
      taskId,
      data: { assignee_uid: assigneeUid },
    });
  };

  const handleDelete = async () => {
    if (!deleteTask)
      return;
    await deleteMutation.mutateAsync(deleteTask.id);
    setDeleteTask(null);
  };

  const handleReassignShow = async (taskId: string, showUid: string) => {
    await reassignShowMutation.mutateAsync({
      taskId,
      data: { show_uid: showUid },
    });
  };

  return (
    <AdminLayout
      title="Tasks"
      description="Manage tasks across studios"
      onRefresh={handleRefresh}
      refreshQueryKey={['admin-tasks']}
    >
      <AdminTable
        data={data?.data || []}
        columns={systemTaskColumns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No tasks found."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={systemTaskSearchableColumns}
        searchColumn="description"
        searchPlaceholder="Search by task, show, assignee..."
        featuredFilterColumns={['studio_name', 'client_name', 'status', 'task_type', 'due_date']}
        onDelete={(task) => setDeleteTask(task)}
        renderExtraActions={(task) => (
          <DropdownMenuItem onClick={() => setSelectedTask(task)}>
            <Eye className="mr-2 h-4 w-4" />
            View details
          </DropdownMenuItem>
        )}
        pagination={
          data?.meta
            ? {
                pageIndex: data.meta.page - 1,
                pageSize: data.meta.limit,
                total: data.meta.total,
                pageCount: data.meta.totalPages,
              }
            : {
                pageIndex: pagination.pageIndex,
                pageSize: pagination.pageSize,
                total: 0,
                pageCount: 0,
              }
        }
        onPaginationChange={onPaginationChange}
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
