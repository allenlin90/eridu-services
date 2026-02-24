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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
  onSubmit: (task: TaskWithRelationsDto, action: TaskAction, content: Record<string, unknown>) => void;
};

function getActionTitle(action: TaskAction | null): string {
  switch (action) {
    case TASK_ACTION.SUBMIT_FOR_REVIEW:
      return 'Submit for Review';
    case TASK_ACTION.APPROVE_COMPLETED:
      return 'Approve as Completed';
    default:
      return 'Run Action';
  }
}

export function StudioTaskActionSheet({
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
  const taskId = task?.id;
  const { data: taskDetail, isLoading: isLoadingTask } = useQuery({
    queryKey: taskId ? studioTaskKeys.detail(studioId, taskId) : studioTaskKeys.all,
    queryFn: () => getStudioTask(studioId, taskId!),
    enabled: open && !!studioId && !!taskId,
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

        <div className="flex-1 overflow-y-auto p-6">
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
              onSubmit(resolvedTask, action, content);
              setIsDirty(false);
              setContentDraft(null);
            }}
            disabled={isPending || isLoadingTask || !resolvedTask || !action}
          >
            {title}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
