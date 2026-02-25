import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import {
  Button,
  DateTimePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '@eridu/ui';

import { getStudioTask, studioTaskKeys } from '@/features/tasks/api/get-studio-task';
import { computeSuggestedDueDate } from '@/features/tasks/lib/task-due-date';

type TaskDueDateDialogProps = {
  task: TaskWithRelationsDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskId: string, dueDate: string | null, version: number) => void;
  isSaving?: boolean;
  studioId?: string;
};

export function TaskDueDateDialog({
  task,
  open,
  onOpenChange,
  onSave,
  isSaving,
  studioId,
}: TaskDueDateDialogProps) {
  const shouldFetch = Boolean(open && studioId && task?.id && !task?.show);
  const { data: taskDetail, isLoading: isLoadingTask } = useQuery({
    queryKey: task?.id && studioId ? studioTaskKeys.detail(studioId, task.id) : studioTaskKeys.all,
    queryFn: () => getStudioTask(studioId!, task!.id),
    enabled: shouldFetch,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const resolvedTask = taskDetail ?? task;
  const suggestedDueDate = useMemo(
    () => computeSuggestedDueDate(resolvedTask ?? null),
    [resolvedTask],
  );
  const [draftDueDate, setDraftDueDate] = useState<{
    taskId: string;
    value: string;
  } | null>(null);

  const dueDate = draftDueDate?.taskId === resolvedTask?.id
    ? (draftDueDate?.value ?? '')
    : (resolvedTask?.due_date ?? suggestedDueDate ?? '');

  if (!resolvedTask) {
    return null;
  }

  const suggestedLabel = suggestedDueDate
    ? format(new Date(suggestedDueDate), 'PPp')
    : null;

  const handleSave = () => {
    const value = (dueDate ?? '').trim();
    onSave(resolvedTask.id, value ? new Date(value).toISOString() : null, resolvedTask.version);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Due Date</DialogTitle>
          <DialogDescription>
            Adjust the deadline for this task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label htmlFor="task_due_date">Due Date</Label>
          <DateTimePicker
            value={dueDate ?? ''}
            onChange={(value) => setDraftDueDate({ taskId: resolvedTask.id, value: value ?? '' })}
            className="w-full"
          />
          {isLoadingTask && (
            <div className="text-xs text-muted-foreground">Loading show details...</div>
          )}
          {suggestedLabel && suggestedDueDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Suggested:
                {' '}
                {suggestedLabel}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setDraftDueDate({ taskId: resolvedTask.id, value: suggestedDueDate })}
                disabled={isSaving}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Apply
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => setDraftDueDate({ taskId: resolvedTask.id, value: '' })}
            disabled={isSaving}
          >
            Clear
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
