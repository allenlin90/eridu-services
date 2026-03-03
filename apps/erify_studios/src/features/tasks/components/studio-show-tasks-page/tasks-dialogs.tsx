import type { TaskAction, TaskWithRelationsDto } from '@eridu/api-types/task-management';

import { BulkTaskGenerationDialog } from '@/features/shows/components/bulk-task-generation-dialog';
import { ShowAssignmentDialog } from '@/features/shows/components/show-assignment-dialog';
import type { ShowSelection } from '@/features/studio-shows/api/get-studio-shows';
import { DeleteTasksDialog } from '@/features/tasks/components/delete-tasks-dialog';
import { StudioTaskActionSheet } from '@/features/tasks/components/studio-task-action-sheet';
import { TaskDueDateDialog } from '@/features/tasks/components/task-due-date-dialog';
import type { TaskActionDraft } from '@/features/tasks/hooks/use-studio-show-tasks-page-state';
import { getTaskActionSheetKey } from '@/features/tasks/lib/studio-show-tasks-page';

type TasksDialogsProps = {
  studioId: string;
  isDeleteDialogOpen: boolean;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onDeleteSelected: () => void;
  selectedCount: number;
  isDeleting: boolean;
  isGenerateDialogOpen: boolean;
  onGenerateDialogOpenChange: (open: boolean) => void;
  currentShow: ShowSelection;
  onTasksChanged: () => void;
  actionDraft: TaskActionDraft | null;
  isUpdatingStatus: boolean;
  onActionSheetOpenChange: (open: boolean) => void;
  onSubmitActionWithContent: (
    task: TaskWithRelationsDto,
    action: TaskAction,
    content?: Record<string, unknown>,
    note?: string,
    options?: {
      onSuccess?: () => void;
    },
  ) => void;
  dueDateTask: TaskWithRelationsDto | null;
  onDueDateDialogOpenChange: (open: boolean) => void;
  onSaveDueDate: (taskId: string, dueDate: string | null, version: number) => void;
  isUpdatingTask: boolean;
  isAssignDialogOpen: boolean;
  onAssignDialogOpenChange: (open: boolean) => void;
};

export function TasksDialogs({
  studioId,
  isDeleteDialogOpen,
  onDeleteDialogOpenChange,
  onDeleteSelected,
  selectedCount,
  isDeleting,
  isGenerateDialogOpen,
  onGenerateDialogOpenChange,
  currentShow,
  onTasksChanged,
  actionDraft,
  isUpdatingStatus,
  onActionSheetOpenChange,
  onSubmitActionWithContent,
  dueDateTask,
  onDueDateDialogOpenChange,
  onSaveDueDate,
  isUpdatingTask,
  isAssignDialogOpen,
  onAssignDialogOpenChange,
}: TasksDialogsProps) {
  return (
    <>
      <DeleteTasksDialog
        open={isDeleteDialogOpen}
        onOpenChange={onDeleteDialogOpenChange}
        onConfirm={onDeleteSelected}
        count={selectedCount}
        isLoading={isDeleting}
      />

      <BulkTaskGenerationDialog
        open={isGenerateDialogOpen}
        onOpenChange={onGenerateDialogOpenChange}
        shows={[currentShow]}
        onSuccess={onTasksChanged}
      />

      <StudioTaskActionSheet
        key={getTaskActionSheetKey(actionDraft)}
        studioId={studioId}
        open={!!actionDraft}
        task={actionDraft?.task ?? null}
        action={actionDraft?.action ?? null}
        isPending={isUpdatingStatus}
        onOpenChange={onActionSheetOpenChange}
        onSubmit={onSubmitActionWithContent}
      />

      <TaskDueDateDialog
        key={dueDateTask?.id ?? 'due-date-dialog'}
        task={dueDateTask}
        studioId={studioId}
        open={!!dueDateTask}
        onOpenChange={onDueDateDialogOpenChange}
        onSave={onSaveDueDate}
        isSaving={isUpdatingTask}
      />

      <ShowAssignmentDialog
        studioId={studioId}
        open={isAssignDialogOpen}
        onOpenChange={onAssignDialogOpenChange}
        shows={[currentShow]}
        onSuccess={onTasksChanged}
      />
    </>
  );
}
