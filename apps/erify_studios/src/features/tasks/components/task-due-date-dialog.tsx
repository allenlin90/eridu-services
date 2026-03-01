import { useQuery, useQueryClient } from '@tanstack/react-query';
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

type DraftDueDate = {
  taskId: string;
  value: string;
};

function resolveDueDateValue(
  draftDueDate: DraftDueDate | null,
  task: TaskWithRelationsDto | null,
  suggestedDueDate: string | null,
): string {
  if (!task) {
    return '';
  }

  if (draftDueDate && draftDueDate.taskId === task.id) {
    return draftDueDate.value;
  }

  return task.due_date ?? suggestedDueDate ?? '';
}

function toIsoDueDateOrError(value: string): { dueDate: string | null; error: string | null } {
  const trimmedValue = value.trim();
  const parsedDate = trimmedValue ? new Date(trimmedValue) : null;
  if (parsedDate && Number.isNaN(parsedDate.getTime())) {
    return { dueDate: null, error: 'Please enter a valid due date.' };
  }

  return { dueDate: parsedDate ? parsedDate.toISOString() : null, error: null };
}

export function TaskDueDateDialog({
  task,
  open,
  onOpenChange,
  onSave,
  isSaving,
  studioId,
}: TaskDueDateDialogProps) {
  const queryClient = useQueryClient();
  const shouldFetch = Boolean(open && studioId && task?.id);
  const { data: taskDetail, isLoading: isLoadingTask } = useQuery({
    queryKey: task?.id && studioId ? studioTaskKeys.detail(studioId, task.id) : studioTaskKeys.all,
    queryFn: () => getStudioTask(studioId!, task!.id),
    enabled: shouldFetch,
    staleTime: 5_000,
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
  const [isResolvingVersion, setIsResolvingVersion] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const dueDate = resolveDueDateValue(draftDueDate, resolvedTask ?? null, suggestedDueDate);

  if (!resolvedTask) {
    return null;
  }

  const suggestedLabel = suggestedDueDate
    ? format(new Date(suggestedDueDate), 'PPp')
    : null;

  const updateDraftDueDate = (value: string) => {
    setInputError(null);
    setDraftDueDate({ taskId: resolvedTask.id, value });
  };

  const handleSave = async () => {
    if (!studioId) {
      return;
    }

    const { dueDate: nextDueDate, error } = toIsoDueDateOrError(dueDate);
    if (error) {
      setInputError(error);
      return;
    }

    setInputError(null);
    setIsResolvingVersion(true);

    try {
      const latestTask = await queryClient.fetchQuery({
        queryKey: studioTaskKeys.detail(studioId, resolvedTask.id),
        queryFn: () => getStudioTask(studioId, resolvedTask.id),
        staleTime: 0,
      });
      onSave(latestTask.id, nextDueDate, latestTask.version);
    } catch {
      // Fall back to current task snapshot if fetching latest version fails.
      onSave(resolvedTask.id, nextDueDate, resolvedTask.version);
    } finally {
      setIsResolvingVersion(false);
    }
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
            onChange={(value) => updateDraftDueDate(value ?? '')}
            className="w-full"
          />
          {inputError && (
            <div className="text-xs text-destructive">{inputError}</div>
          )}
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
                onClick={() => updateDraftDueDate(suggestedDueDate)}
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
            onClick={() => updateDraftDueDate('')}
            disabled={isSaving || isResolvingVersion}
          >
            Clear
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isResolvingVersion || isLoadingTask}>
            {(isSaving || isResolvingVersion) ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
