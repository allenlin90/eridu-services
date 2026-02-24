import { format } from 'date-fns';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { TaskStatus, TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { TASK_ACTION, TASK_STATUS, TemplateSchemaValidator } from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@eridu/ui';

import { useUpdateMyTask } from '../hooks/use-update-my-task';

import { JsonForm } from '@/components/json-form/json-form';

type TaskExecutionSheetProps = {
  task: TaskWithRelationsDto | null;
  onClose: () => void;
  studioId: string;
};

const STATUS_VARIANT: Partial<Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'outline'>> = {
  COMPLETED: 'default',
  REVIEW: 'secondary',
  BLOCKED: 'destructive',
};

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

export function TaskExecutionSheet({ task, onClose, studioId: _studioId }: TaskExecutionSheetProps) {
  const { mutate: updateTask, isPending } = useUpdateMyTask();
  const [draft, setDraft] = useState<{ taskId: string; content: Record<string, unknown> } | null>(null);

  // All hooks above — early return is safe here
  if (!task)
    return null;

  // task is narrowed to TaskWithRelationsDto from here on
  const parsedSchema = task.snapshot?.schema
    ? TemplateSchemaValidator.safeParse(task.snapshot.schema)
    : null;
  const uiSchema = parsedSchema?.success ? parsedSchema.data : null;

  const isReadOnly = task.status === TASK_STATUS.COMPLETED
    || task.status === TASK_STATUS.CLOSED;

  const formValues: Record<string, unknown> = draft?.taskId === task.id
    ? draft.content
    : (task.content ?? {});

  const rejectionNote = task.metadata?.rejection_note as string | undefined;
  const blockedReason = task.metadata?.blocked_reason as string | undefined;
  const isOverdue = task.due_date ? new Date(task.due_date) < new Date() : false;

  const handleRunAction = (action: keyof typeof TASK_ACTION) => {
    const isSubmitAction = action === 'SUBMIT_FOR_REVIEW' || action === 'APPROVE_COMPLETED';
    const showStartTime = task.show?.start_time ? new Date(task.show.start_time) : null;

    if (
      isSubmitAction
      && showStartTime
      && (task.type === 'ACTIVE' || task.type === 'CLOSURE')
      && new Date() < showStartTime
    ) {
      toast.error(`${task.type} tasks cannot be submitted before show start time.`);
      return;
    }

    const nextContent = draft?.taskId === task.id ? draft.content : task.content;
    updateTask(
      {
        taskId: task.id,
        data: {
          version: task.version,
          action: TASK_ACTION[action],
          ...(nextContent ? { content: nextContent } : {}),
        },
      },
      {
        onSuccess: () => {
          if (action === 'APPROVE_COMPLETED') {
            onClose();
          }
        },
      },
    );
  };

  const handleFormChange = (values: Record<string, unknown>) => {
    setDraft({ taskId: task.id, content: values });
  };

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-slate-50">
        <SheetHeader className="p-6 bg-white border-b">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={task.status} />
            {task.due_date && (
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due:
                {' '}
                {format(new Date(task.due_date), 'PPP')}
              </span>
            )}
          </div>
          <SheetTitle className="text-xl leading-tight">{task.description}</SheetTitle>
          <SheetDescription className="text-sm">
            {task.show ? `Show: ${task.show.name}` : 'No show context'}
            {task.template && ` • Template: ${task.template.name}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {task.status === TASK_STATUS.IN_PROGRESS && rejectionNote && (
            <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Reviewer note</p>
                <p className="text-sm text-amber-700 mt-0.5">{rejectionNote}</p>
              </div>
            </div>
          )}

          {task.status === TASK_STATUS.BLOCKED && blockedReason && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Task blocked</p>
                <p className="text-sm text-red-700 mt-0.5">{blockedReason}</p>
              </div>
            </div>
          )}

          {task.status === TASK_STATUS.REVIEW && (
            <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Awaiting review</p>
                <p className="text-sm text-blue-700 mt-0.5">
                  This task has been submitted and is pending approval. You can continue editing if needed.
                </p>
              </div>
            </div>
          )}

          {isOverdue && (
            <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Task is overdue</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Submission is still allowed. Hard deadline enforcement can be enabled in a future studio setting.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h4 className="text-sm font-semibold mb-4">Task Checklist</h4>
            {uiSchema
              ? (
                  <JsonForm
                    schema={uiSchema}
                    values={formValues}
                    onChange={isReadOnly ? undefined : handleFormChange}
                    readOnly={isReadOnly}
                  />
                )
              : (
                  <p className="text-sm text-muted-foreground italic">
                    {task.snapshot?.schema
                      ? 'Unable to render form — invalid schema.'
                      : 'No form template attached to this task.'}
                  </p>
                )}
          </div>
        </div>

        <div className="p-4 bg-white border-t flex flex-col gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
          {(task.status === TASK_STATUS.PENDING || task.status === TASK_STATUS.IN_PROGRESS) && (
            <Button
              className="w-full"
              size="lg"
              onClick={() => handleRunAction('SUBMIT_FOR_REVIEW')}
              disabled={isPending}
            >
              <Send className="w-5 h-5 mr-2" />
              Submit for Review
            </Button>
          )}

          {task.status === TASK_STATUS.REVIEW && (
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => handleRunAction('CONTINUE_EDITING')}
              disabled={isPending}
            >
              Continue Editing
            </Button>
          )}

          {task.status === TASK_STATUS.COMPLETED && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Task completed
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
