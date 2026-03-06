import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { Eye, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { adaptColumnFiltersChange, adaptPaginationChange, Button, DataTable, DataTableActions, DataTablePagination, DataTableToolbar, DropdownMenuItem } from '@eridu/ui';

import { AdminLayout } from '@/features/admin/components';
import { DeleteConfirmDialog } from '@/features/admin/components/delete-confirm-dialog';
import { getShows } from '@/features/shows/api/get-shows';
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
import { checkAssigneeShiftCoverageInShowWindow } from '@/features/tasks/lib/task-assignment-shift-coverage';
import { buildShiftCoverageWarning } from '@/features/tasks/lib/task-assignment-shift-warning';

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
    gcTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const { data: showSummary } = useQuery({
    queryKey: ['system-show-summary', showId],
    queryFn: async () => {
      const response = await getShows({
        page: 1,
        limit: 1,
        id: showId,
      });

      return response.data[0] ?? null;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  const reassignMutation = useReassignAdminTask();
  const reassignShowMutation = useReassignAdminTaskShow();
  const deleteMutation = useDeleteAdminTask();
  const updateMutation = useUpdateAdminTask();

  const warningStudioId = showSummary?.studio_id ?? null;

  const handleAssign = async (taskId: string, assigneeUid: string | null) => {
    if (
      assigneeUid
      && warningStudioId
      && selectedTask
      && selectedTask.id === taskId
      && selectedTask.show
    ) {
      try {
        const coverageResult = await checkAssigneeShiftCoverageInShowWindow(
          warningStudioId,
          assigneeUid,
          {
            name: selectedTask.show.name,
            start_time: selectedTask.show.start_time,
            end_time: selectedTask.show.end_time,
          },
        );

        if (!coverageResult.hasCoverage && coverageResult.showStart) {
          toast.warning(buildShiftCoverageWarning(selectedTask.show.name, coverageResult.showStart));
        }
      } catch {
        // Non-blocking warning check: assignment should proceed even if lookup fails.
      }
    }

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

  const tablePagination = {
    pageIndex: (data?.meta.page ?? 1) - 1,
    pageSize: data?.meta.limit ?? pagination.pageSize,
    total: data?.meta.total ?? 0,
    pageCount: data?.meta.totalPages ?? 0,
  };

  const columnsWithActions = useMemo<ColumnDef<TaskWithRelationsDto>[]>(() => [
    ...systemTaskColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onDelete={(task) => setDeleteTask(task)}
          renderExtraActions={(task) => (
            <DropdownMenuItem onClick={() => setSelectedTask(task)}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
          )}
        />
      ),
      size: 50,
      enableHiding: false,
    } as ColumnDef<TaskWithRelationsDto>,
  ], []);

  return (
    <AdminLayout
      title={`Tasks for Show ${showId}`}
      description="System-admin scoped task operations for this show."
      onRefresh={handleRefresh}
      refreshQueryKey={adminTasksKeys.all}
    >
      <DataTable
        data={data?.data || []}
        columns={columnsWithActions}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No tasks found for this show."
        manualPagination
        manualFiltering
        pageCount={tablePagination.pageCount}
        paginationState={{
          pageIndex: tablePagination.pageIndex,
          pageSize: tablePagination.pageSize,
        }}
        onPaginationChange={adaptPaginationChange(tablePagination, setPagination)}
        columnFilters={columnFilters}
        onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, setColumnFilters)}
        renderToolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchableColumns={systemTaskSearchableColumns}
            searchColumn="description"
            searchPlaceholder="Search by task, assignee..."
            featuredFilterColumns={['status', 'task_type', 'due_date']}
          >
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isFetching}
              aria-label="Refresh tasks"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </DataTableToolbar>
        )}
        renderFooter={() => (
          <DataTablePagination
            pagination={tablePagination}
            onPaginationChange={setPagination}
          />
        )}
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
