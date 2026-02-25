import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  TASK_ACTION,
  type TaskAction,
  type TaskWithRelationsDto,
  TemplateSchemaValidator,
} from '@eridu/api-types/task-management';
import {
  Button,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@eridu/ui';

import { JsonForm } from '@/components/json-form/json-form';
import { getStudioTask, studioTaskKeys } from '@/features/tasks/api/get-studio-task';

type StudioTaskActionSheetProps = {
  studioId: string;
  open: boolean;
  task: TaskWithRelationsDto | null;
  action: TaskAction | null;
  isPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    task: TaskWithRelationsDto,
    action: TaskAction,
    content?: Record<string, unknown>,
    note?: string,
  ) => void;
};

function getActionTitle(action: TaskAction | null): string {
  switch (action) {
    case TASK_ACTION.SUBMIT_FOR_REVIEW:
      return 'Submit for Review';
    case TASK_ACTION.APPROVE_COMPLETED:
      return 'Approve as Completed';
    case TASK_ACTION.CONTINUE_EDITING:
      return 'Send Back for Edits';
    case TASK_ACTION.MARK_BLOCKED:
      return 'Mark as Blocked';
    default:
      return 'Run Action';
  }
}

function StudioTaskActionSheetBody({
  studioId,
  open,
  task,
  action,
  isPending = false,
  onOpenChange,
  onSubmit,
}: StudioTaskActionSheetProps) {
  const [contentDraft, setContentDraft] = useState<Record<string, unknown> | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [note, setNote] = useState('');
  const taskId = task?.id;
  const requiresContent = action === TASK_ACTION.SUBMIT_FOR_REVIEW || action === TASK_ACTION.APPROVE_COMPLETED;
  const requiresNote = action === TASK_ACTION.CONTINUE_EDITING || action === TASK_ACTION.MARK_BLOCKED;
  const { data: taskDetail, isLoading: isLoadingTask } = useQuery({
    queryKey: taskId ? studioTaskKeys.detail(studioId, taskId) : studioTaskKeys.all,
    queryFn: () => getStudioTask(studioId, taskId!),
    enabled: open && requiresContent && !!studioId && !!taskId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const resolvedTask = taskDetail ?? task;
  const parsedSchema = resolvedTask?.snapshot?.schema
    ? TemplateSchemaValidator.safeParse(resolvedTask.snapshot.schema)
    : null;
  const schema = parsedSchema?.success ? parsedSchema.data : null;
  const content = isDirty
    ? (contentDraft ?? {})
    : ((resolvedTask?.content as Record<string, unknown> | null) ?? {});

  const title = getActionTitle(action);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-full">
        <SheetHeader className="p-6 border-b">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {resolvedTask ? resolvedTask.description : 'Task action'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {requiresContent && (
            <>
              {isLoadingTask && (
                <p className="text-sm text-muted-foreground">Loading task schema...</p>
              )}
              {schema
                ? (
                    <JsonForm
                      schema={schema}
                      values={content}
                      onChange={(values) => {
                        setIsDirty(true);
                        setContentDraft(values);
                      }}
                    />
                  )
                : (
                    <p className="text-sm text-muted-foreground">
                      This task has no renderable schema. Action will submit current content as-is.
                    </p>
                  )}
            </>
          )}

          {requiresNote && (
            <div className="space-y-2">
              <Label htmlFor="task-action-note">Note</Label>
              <Textarea
                id="task-action-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={action === TASK_ACTION.MARK_BLOCKED ? 'Add the blocker reason...' : 'Explain what needs fixing...'}
                className="min-h-24"
              />
            </div>
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!resolvedTask || !action) {
                return;
              }
              const noteValue = requiresNote ? note.trim() : undefined;
              onSubmit(resolvedTask, action, requiresContent ? content : undefined, noteValue);
            }}
            disabled={
              isPending
              || isLoadingTask
              || !resolvedTask
              || !action
              || (requiresNote && note.trim().length === 0)
            }
          >
            {title}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function StudioTaskActionSheet(props: StudioTaskActionSheetProps) {
  const { task, action, ...rest } = props;
  const key = `${task?.id ?? 'empty'}:${action ?? 'none'}`;
  return (
    <StudioTaskActionSheetBody
      key={key}
      task={task}
      action={action}
      {...rest}
    />
  );
}
