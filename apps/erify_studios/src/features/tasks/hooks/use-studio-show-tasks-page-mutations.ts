import { useCallback } from 'react';

import type { TaskAction, TaskWithRelationsDto } from '@eridu/api-types/task-management';

import { useAssignTask } from '@/features/tasks/hooks/use-assign-task';
import { useDeleteTasks } from '@/features/tasks/hooks/use-delete-tasks';
import { useUpdateStudioTask } from '@/features/tasks/hooks/use-update-studio-task';
import { useUpdateStudioTaskStatus } from '@/features/tasks/hooks/use-update-studio-task-status';
import { requiresTaskActionSheet } from '@/features/tasks/lib/task-action-sheet';

type UseStudioShowTasksPageMutationsProps = {
  studioId: string;
  showId: string;
  onDeleteSuccess: () => void;
  onOpenTaskActionDraft: (task: TaskWithRelationsDto, action: TaskAction) => void;
  onClearTaskActionDraft: () => void;
  onClearDueDateTask: () => void;
};

export function useStudioShowTasksPageMutations({
  studioId,
  showId,
  onDeleteSuccess,
  onOpenTaskActionDraft,
  onClearTaskActionDraft,
  onClearDueDateTask,
}: UseStudioShowTasksPageMutationsProps) {
  const { mutate: assignTask, isPending: isAssigning } = useAssignTask({ studioId, showId });
  const { mutate: deleteTasks, isPending: isDeleting } = useDeleteTasks({
    studioId,
    showId,
    onSuccess: onDeleteSuccess,
  });
  const {
    mutate: updateTaskStatus,
    isPending: isUpdatingStatus,
    variables: updateStatusVariables,
  } = useUpdateStudioTaskStatus({ studioId, showId });
  const { mutate: updateTask, isPending: isUpdatingTask } = useUpdateStudioTask({ studioId, showId });

  const handleAssign = useCallback((taskId: string, assigneeUid: string | null) => {
    assignTask({ taskId, assigneeUid });
  }, [assignTask]);
  const processingTaskId = updateStatusVariables?.taskId ?? null;

  const handleRunAction = useCallback((
    task: TaskWithRelationsDto,
    action: TaskAction,
  ) => {
    if (requiresTaskActionSheet(action)) {
      onOpenTaskActionDraft(task, action);
      return;
    }

    updateTaskStatus({
      taskId: task.id,
      data: {
        version: task.version,
        action,
      },
    });
  }, [onOpenTaskActionDraft, updateTaskStatus]);

  const handleSubmitActionWithContent = useCallback((
    task: TaskWithRelationsDto,
    action: TaskAction,
    content?: Record<string, unknown>,
    note?: string,
    options?: {
      onSuccess?: () => void;
    },
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
          onClearTaskActionDraft();
          options?.onSuccess?.();
        },
      },
    );
  }, [onClearTaskActionDraft, updateTaskStatus]);

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
        onSuccess: onClearDueDateTask,
      },
    );
  }, [onClearDueDateTask, updateTask]);

  const deleteSelectedTasks = useCallback((selectedUids: string[]) => {
    if (selectedUids.length > 0) {
      deleteTasks(selectedUids);
    }
  }, [deleteTasks]);

  return {
    handleAssign,
    handleRunAction,
    handleSubmitActionWithContent,
    handleSaveDueDate,
    deleteSelectedTasks,
    processingTaskId,
    isAssigning,
    isDeleting,
    isUpdatingStatus,
    isUpdatingTask,
  };
}
