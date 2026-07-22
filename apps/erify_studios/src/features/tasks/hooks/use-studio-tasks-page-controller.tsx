import { useCallback, useMemo, useState } from 'react';

import type { TaskAction, TaskWithRelationsDto } from '@eridu/api-types/task-management';

import type { TaskReviewActiveFilter } from '@/features/tasks/components/studio-task-review-summary-panel';
import { getStudioTaskColumns } from '@/features/tasks/config/studio-task-columns';
import { useStudioTasks } from '@/features/tasks/hooks/use-studio-tasks';
import { useUpdateStudioTask } from '@/features/tasks/hooks/use-update-studio-task';
import { useUpdateStudioTaskStatus } from '@/features/tasks/hooks/use-update-studio-task-status';
import { requiresTaskActionSheet } from '@/features/tasks/lib/task-action-sheet';

type UseStudioTasksPageControllerProps = {
  studioId: string;
  reviewTab?: TaskReviewActiveFilter;
  canManage: boolean;
  onOpenQcReview: (task: TaskWithRelationsDto) => void;
};

type ActionDraft = {
  task: TaskWithRelationsDto;
  action: TaskAction;
};

export function useStudioTasksPageController({ studioId, reviewTab, canManage, onOpenQcReview }: UseStudioTasksPageControllerProps) {
  const [actionDraft, setActionDraft] = useState<ActionDraft | null>(null);
  const [dueDateTask, setDueDateTask] = useState<TaskWithRelationsDto | null>(null);

  const {
    data,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
    dueDateRange,
    onDueDateRangeChange,
    onDueDateRangeReset,
    handleRefresh,
  } = useStudioTasks({ studioId, reviewTab });

  const {
    mutate: updateTaskStatus,
    isPending: isUpdatingStatus,
    variables: updateStatusVariables,
  } = useUpdateStudioTaskStatus({ studioId });
  const { mutate: updateTask, isPending: isUpdatingTask } = useUpdateStudioTask({ studioId });
  const processingTaskId = updateStatusVariables?.taskId ?? null;

  const openDueDateEditor = useCallback((task: TaskWithRelationsDto) => {
    setDueDateTask(task);
  }, []);
  const handleRunAction = useCallback((task: TaskWithRelationsDto, action: TaskAction) => {
    if (requiresTaskActionSheet(action)) {
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
    options?: { onSuccess?: () => void },
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
        onSuccess: () => {
          setActionDraft(null);
          options?.onSuccess?.();
        },
      },
    );
  }, [updateTaskStatus]);
  const handleActionSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setActionDraft(null);
    }
  }, []);
  const handleDueDateDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDueDateTask(null);
    }
  }, []);
  const handleSaveDueDate = useCallback((taskId: string, dueDate: string | null, version: number) => {
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
  }, [updateTask]);

  const columns = useMemo(
    () => getStudioTaskColumns(
      studioId,
      handleRunAction,
      isUpdatingStatus ? processingTaskId : null,
      openDueDateEditor,
      onOpenQcReview,
      canManage,
    ),
    [studioId, handleRunAction, isUpdatingStatus, processingTaskId, openDueDateEditor, onOpenQcReview, canManage],
  );

  const tablePagination = data?.meta
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
      };

  return {
    tableProps: {
      data: data?.data || [],
      columns,
      isLoading,
      isFetching,
      emptyMessage: 'No tasks found.',
      columnFilters,
      onColumnFiltersChange,
      searchColumn: 'description',
      searchPlaceholder: 'Search by task, show, assignee...',
      featuredFilterColumns: ['client_name', 'status', 'task_type'] as const,
      pagination: tablePagination,
      onPaginationChange,
    },
    reviewScopeProps: {
      dateRange: dueDateRange,
      onDateRangeChange: onDueDateRangeChange,
      onResetDateRange: onDueDateRangeReset,
    },
    toolbarProps: {
      onRefresh: handleRefresh,
    },
    setPageCount,
    actionSheetProps: {
      key: actionDraft ? `${actionDraft.task.id}:${actionDraft.task.version}:${actionDraft.action}` : 'studio-review-task-action',
      studioId,
      open: !!actionDraft,
      task: actionDraft?.task ?? null,
      action: actionDraft?.action ?? null,
      isPending: isUpdatingStatus,
      onOpenChange: handleActionSheetOpenChange,
      onSubmit: handleSubmitAction,
    },
    dueDateDialogProps: {
      key: dueDateTask?.id ?? 'due-date-dialog',
      task: dueDateTask,
      studioId,
      open: !!dueDateTask,
      onOpenChange: handleDueDateDialogOpenChange,
      onSave: handleSaveDueDate,
      isSaving: isUpdatingTask,
    },
  };
}
