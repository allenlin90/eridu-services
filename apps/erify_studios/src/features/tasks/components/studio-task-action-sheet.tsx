import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

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

import type { JsonFormHandle, JsonFormUploadState } from '@/components/json-form/json-form';
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

const DEFAULT_UPLOAD_STATE: JsonFormUploadState = {
  hasPendingUploads: false,
  hasBlockingIssues: false,
  isPreparingUploads: false,
  blockingMessages: [],
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
  const [isPreparingSubmit, setIsPreparingSubmit] = useState(false);
  const [uploadState, setUploadState] = useState<JsonFormUploadState>(DEFAULT_UPLOAD_STATE);
  const jsonFormRef = useRef<JsonFormHandle>(null);
  const taskId = task?.id;
  const requiresContent = action === TASK_ACTION.SUBMIT_FOR_REVIEW || action === TASK_ACTION.APPROVE_COMPLETED;
  const requiresNote = action === TASK_ACTION.CONTINUE_EDITING || action === TASK_ACTION.MARK_BLOCKED;
  const hasPreparingUploads = requiresContent && uploadState.isPreparingUploads;
  const hasUploadValidationIssues = requiresContent && uploadState.hasBlockingIssues && !uploadState.isPreparingUploads;
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
                      ref={jsonFormRef}
                      schema={schema}
                      values={content}
                      uploadTaskId={resolvedTask?.id}
                      onUploadStateChange={setUploadState}
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
              {hasPreparingUploads && (
                <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Preparing images for upload. You can submit once preparation is complete.
                </p>
              )}
              {hasUploadValidationIssues && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {uploadState.blockingMessages[0] ?? 'Please fix file upload issues before continuing.'}
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
            onClick={async () => {
              if (!resolvedTask || !action) {
                return;
              }
              if (isPreparingSubmit) {
                return;
              }
              setIsPreparingSubmit(true);
              let nextContent = content;
              if (requiresContent && jsonFormRef.current) {
                if (hasPreparingUploads || hasUploadValidationIssues) {
                  toast.error(
                    hasPreparingUploads
                      ? 'Please wait. Images are still being prepared.'
                      : (uploadState.blockingMessages[0] ?? 'Please fix file upload issues before continuing'),
                  );
                  setIsPreparingSubmit(false);
                  return;
                }
                try {
                  nextContent = await jsonFormRef.current.flushPendingFileUploads();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Failed to upload pending files');
                  setIsPreparingSubmit(false);
                  return;
                }
              }
              const noteValue = requiresNote ? note.trim() : undefined;
              onSubmit(resolvedTask, action, requiresContent ? nextContent : undefined, noteValue);
              setIsPreparingSubmit(false);
            }}
            disabled={
              isPending
              || isPreparingSubmit
              || isLoadingTask
              || !resolvedTask
              || !action
              || hasPreparingUploads
              || hasUploadValidationIssues
              || (requiresNote && note.trim().length === 0)
            }
          >
            {isPreparingSubmit
              ? 'Uploading files...'
              : (hasPreparingUploads ? 'Preparing images...' : title)}
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
