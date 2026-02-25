import { createFileRoute } from '@tanstack/react-router';
import { RotateCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { TaskAction, TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { TASK_ACTION } from '@eridu/api-types/task-management';
import { Button } from '@eridu/ui';

import { AdminTable } from '@/features/admin/components/admin-table';
import { StudioTaskActionSheet } from '@/features/tasks/components/studio-task-action-sheet';
import { TaskDueDateDialog } from '@/features/tasks/components/task-due-date-dialog';
import {
  getStudioTaskColumns,
  studioTaskSearchableColumns,
} from '@/features/tasks/config/studio-task-columns';
import { studioTaskSearchSchema } from '@/features/tasks/config/studio-task-search-schema';
import { useStudioTasks } from '@/features/tasks/hooks/use-studio-tasks';
import { useUpdateStudioTask } from '@/features/tasks/hooks/use-update-studio-task';
import { useUpdateStudioTaskStatus } from '@/features/tasks/hooks/use-update-studio-task-status';

export const Route = createFileRoute('/studios/$studioId/tasks')({
  component: StudioTasksPage,
  validateSearch: (search) => studioTaskSearchSchema.parse(search),
});

function StudioTasksPage() {
  const { studioId } = Route.useParams();
  const [actionDraft, setActionDraft] = useState<{ task: TaskWithRelationsDto; action: TaskAction } | null>(null);
  const [dueDateTask, setDueDateTask] = useState<TaskWithRelationsDto | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    handleRefresh,
  } = useStudioTasks({ studioId });

  const { mutate: updateTaskStatus, isPending: isUpdatingStatus, variables: updateStatusVariables }
    = useUpdateStudioTaskStatus({ studioId });
  const { mutate: updateTask, isPending: isUpdatingTask } = useUpdateStudioTask({ studioId });
  const processingTaskId = updateStatusVariables?.taskId ?? null;

  const handleRunAction = useCallback((task: TaskWithRelationsDto, action: TaskAction) => {
    const requiresForm = action === TASK_ACTION.SUBMIT_FOR_REVIEW || action === TASK_ACTION.APPROVE_COMPLETED;
    const requiresNote = action === TASK_ACTION.CONTINUE_EDITING || action === TASK_ACTION.MARK_BLOCKED;

    if (requiresForm || requiresNote) {
      setActionDraft({ task, action });
      return;
    }

    updateTaskStatus({
      taskId: task.id,
      data: {
        version: task.version,
        action,
      },
    });
  }, [updateTaskStatus]);

  const handleSubmitAction = useCallback((
    task: TaskWithRelationsDto,
    action: TaskAction,
    content?: Record<string, unknown>,
    note?: string,
  ) => {
    updateTaskStatus(
      {
        taskId: task.id,
        data: {
          version: task.version,
          action,
          ...(content ? { content } : {}),
          ...(note ? { note } : {}),
        },
      },
      {
        onSuccess: () => setActionDraft(null),
      },
    );
  }, [updateTaskStatus]);

  const columns = useMemo(
    () => getStudioTaskColumns(
      handleRunAction,
      isUpdatingStatus ? processingTaskId : null,
      (task) => setDueDateTask(task),
    ),
    [handleRunAction, isUpdatingStatus, processingTaskId],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
        <p className="text-muted-foreground">
          Review submitted tasks and manage task actions across the studio.
        </p>
      </div>

      <AdminTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage="No tasks found."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={studioTaskSearchableColumns}
        searchColumn="description"
        searchPlaceholder="Search by task, show, assignee..."
        featuredFilterColumns={['client_name', 'status', 'task_type', 'due_date']}
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

      <StudioTaskActionSheet
        key={actionDraft ? `${actionDraft.task.id}:${actionDraft.task.version}:${actionDraft.action}` : 'studio-review-task-action'}
        studioId={studioId}
        open={!!actionDraft}
        task={actionDraft?.task ?? null}
        action={actionDraft?.action ?? null}
        isPending={isUpdatingStatus}
        onOpenChange={(open) => {
          if (!open) {
            setActionDraft(null);
          }
        }}
        onSubmit={handleSubmitAction}
      />

      <TaskDueDateDialog
        key={dueDateTask?.id ?? 'due-date-dialog'}
        task={dueDateTask}
        studioId={studioId}
        open={!!dueDateTask}
        onOpenChange={(open) => {
          if (!open) {
            setDueDateTask(null);
          }
        }}
        onSave={(taskId, dueDate, version) => {
          updateTask(
            {
              taskId,
              data: {
                version,
                due_date: dueDate,
              },
            },
            {
              onSuccess: () => setDueDateTask(null),
            },
          );
        }}
        isSaving={isUpdatingTask}
      />
    </div>
  );
}
