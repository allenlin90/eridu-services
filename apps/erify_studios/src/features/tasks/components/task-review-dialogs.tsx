import type { ComponentProps } from 'react';

import type { BulkApproveTasksResponse } from '@eridu/api-types/task-management';

import { BulkApproveResultsDialog } from '@/features/tasks/components/bulk-approve-results-dialog';
import { StudioTaskActionSheet } from '@/features/tasks/components/studio-task-action-sheet';
import { TaskDueDateDialog } from '@/features/tasks/components/task-due-date-dialog';

type TaskReviewDialogsProps = {
  results: BulkApproveTasksResponse | null;
  resultsOpen: boolean;
  onResultsOpenChange: (open: boolean) => void;
  actionSheetKey: string;
  actionSheetProps: ComponentProps<typeof StudioTaskActionSheet>;
  dueDateDialogKey: string;
  dueDateDialogProps: ComponentProps<typeof TaskDueDateDialog>;
};

/** Manager-only task mutation dialogs grouped away from the read-only evidence viewer. */
export function TaskReviewDialogs({
  results,
  resultsOpen,
  onResultsOpenChange,
  actionSheetKey,
  actionSheetProps,
  dueDateDialogKey,
  dueDateDialogProps,
}: TaskReviewDialogsProps) {
  return (
    <>
      <BulkApproveResultsDialog results={results} open={resultsOpen} onOpenChange={onResultsOpenChange} />
      <StudioTaskActionSheet key={actionSheetKey} {...actionSheetProps} />
      <TaskDueDateDialog key={dueDateDialogKey} {...dueDateDialogProps} />
    </>
  );
}
