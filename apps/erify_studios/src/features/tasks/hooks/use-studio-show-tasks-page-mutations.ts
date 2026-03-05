import { useCallback } from 'react';
import { toast } from 'sonner';

import type { TaskAction, TaskWithRelationsDto } from '@eridu/api-types/task-management';

import { getStudioShifts } from '@/features/studio-shifts/api/get-studio-shifts';
import { addDays } from '@/features/studio-shifts/utils/shift-date.utils';
import { toLocalDateInputValue } from '@/features/studio-shifts/utils/shift-form.utils';
import { useAssignTask } from '@/features/tasks/hooks/use-assign-task';
import { useDeleteTasks } from '@/features/tasks/hooks/use-delete-tasks';
import { useUpdateStudioTask } from '@/features/tasks/hooks/use-update-studio-task';
import { useUpdateStudioTaskStatus } from '@/features/tasks/hooks/use-update-studio-task-status';
import { requiresTaskActionSheet } from '@/features/tasks/lib/task-action-sheet';
import {
  buildShiftCoverageWarning,
  hasShiftCoverageForWindow,
} from '@/features/tasks/lib/task-assignment-shift-warning';

const SHIFT_COVERAGE_QUERY_LIMIT = 200;
const SHIFT_COVERAGE_LOOKBACK_DAYS = 1;

type UseStudioShowTasksPageMutationsProps = {
  studioId: string;
  showId: string;
  showWindow: {
    name: string;
    start_time: string;
    end_time: string;
  } | null;
  onDeleteSuccess: () => void;
  onOpenTaskActionDraft: (task: TaskWithRelationsDto, action: TaskAction) => void;
  onClearTaskActionDraft: () => void;
  onClearDueDateTask: () => void;
};

export function useStudioShowTasksPageMutations({
  studioId,
  showId,
  showWindow,
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

  const handleAssign = useCallback(async (task: TaskWithRelationsDto, assigneeUid: string | null) => {
    if (assigneeUid && showWindow) {
      try {
        const showStart = new Date(showWindow.start_time);
        const showEnd = new Date(showWindow.end_time);
        const shifts = await getStudioShifts(studioId, {
          page: 1,
          limit: SHIFT_COVERAGE_QUERY_LIMIT,
          user_id: assigneeUid,
          date_from: toLocalDateInputValue(addDays(showStart, -SHIFT_COVERAGE_LOOKBACK_DAYS)),
          date_to: toLocalDateInputValue(showEnd),
        });

        const hasOverlappingShift = hasShiftCoverageForWindow(shifts.data, showStart, showEnd);

        if (!hasOverlappingShift) {
          toast.warning(buildShiftCoverageWarning(showWindow.name, showStart));
        }
      } catch {
        // Non-blocking warning check: assignment should proceed even if lookup fails.
      }
    }

    assignTask({ taskId: task.id, assigneeUid });
  }, [assignTask, showWindow, studioId]);
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
