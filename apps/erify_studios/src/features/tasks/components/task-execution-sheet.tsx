import { format } from 'date-fns';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Paperclip, Send, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { TaskStatus, TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { TASK_ACTION, TASK_STATUS, TemplateSchemaValidator } from '@eridu/api-types/task-management';
import { FILE_UPLOAD_USE_CASE } from '@eridu/api-types/uploads';
import {
  Badge,
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@eridu/ui';

import { requestPresignedUpload, uploadFileToPresignedUrl } from '../api/presign-upload';
import { useUpdateMyTask } from '../hooks/use-update-my-task';
import { calculateTaskProgress } from '../lib/progress';

import { JsonForm } from '@/components/json-form/json-form';
import { ProgressBar } from '@/components/progress-bar';

type TaskExecutionSheetProps = {
  task: TaskWithRelationsDto | null;
  onClose: () => void;
  studioId: string;
  enableAutosave?: boolean;
};

const DRAFT_AUTOSAVE_DEBOUNCE_MS = 650;
const QC_UPLOAD_CONTENT_KEY = 'qc_screenshot_urls';
const SUPPORTED_QC_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type DraftSaveState = 'idle' | 'dirty' | 'saving' | 'saved';

function isSupportedQcMimeType(value: string): value is (typeof SUPPORTED_QC_MIME_TYPES)[number] {
  return SUPPORTED_QC_MIME_TYPES.includes(value as (typeof SUPPORTED_QC_MIME_TYPES)[number]);
}

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

type TaskExecutionSheetInnerProps = {
  task: TaskWithRelationsDto;
  onClose: () => void;
  enableAutosave: boolean;
};

type DraftStateEntry = {
  taskId: string;
  content: Record<string, unknown>;
  saveState: DraftSaveState;
};

function TaskExecutionSheetInner({ task, onClose, enableAutosave }: TaskExecutionSheetInnerProps) {
  const { mutate: updateTask, mutateAsync: updateTaskAsync, isPending } = useUpdateMyTask();
  // Keyed by taskId — automatically "resets" when task changes without needing an effect
  const [draftState, setDraftState] = useState<DraftStateEntry | null>(null);
  const [uploadSelection, setUploadSelection] = useState<{ taskId: string; file: File | null } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const draftAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // currentDraft is null whenever the stored draft belongs to a different task
  const currentDraft = draftState?.taskId === task.id ? draftState : null;
  const selectedUploadFile = uploadSelection?.taskId === task.id ? uploadSelection.file : null;
  const draftSaveState: DraftSaveState = currentDraft?.saveState ?? 'idle';
  const hasDraft = currentDraft !== null;

  const parsedSchema = task.snapshot?.schema
    ? TemplateSchemaValidator.safeParse(task.snapshot.schema)
    : null;
  const uiSchema = parsedSchema?.success ? parsedSchema.data : null;

  const isReadOnly = task.status === TASK_STATUS.COMPLETED
    || task.status === TASK_STATUS.CLOSED;

  const formValues = useMemo<Record<string, unknown>>(
    () => currentDraft?.content ?? task.content ?? {},
    [currentDraft?.content, task.content],
  );
  const progress = uiSchema
    ? calculateTaskProgress(
        { ...task, content: formValues } as Parameters<typeof calculateTaskProgress>[0],
        uiSchema,
      )
    : null;
  const taskContentString = useMemo(() => JSON.stringify(task.content ?? {}), [task.content]);
  const formValuesString = useMemo(() => JSON.stringify(formValues), [formValues]);
  const hasUnsavedDraftChanges = hasDraft && formValuesString !== taskContentString;
  const uploadedQcScreenshots = useMemo(
    () => (Array.isArray(formValues[QC_UPLOAD_CONTENT_KEY]) ? (formValues[QC_UPLOAD_CONTENT_KEY] as string[]) : []),
    [formValues],
  );

  const rejectionNote = task.metadata?.rejection_note as string | undefined;
  const blockedReason = task.metadata?.blocked_reason as string | undefined;
  const isOverdue = task.due_date ? new Date(task.due_date) < new Date() : false;

  useEffect(() => {
    if (!enableAutosave || !hasDraft || !hasUnsavedDraftChanges || isReadOnly) {
      return;
    }

    if (draftAutoSaveTimerRef.current) {
      clearTimeout(draftAutoSaveTimerRef.current);
    }

    draftAutoSaveTimerRef.current = setTimeout(() => {
      setDraftState((prev) =>
        prev?.taskId === task.id ? { ...prev, saveState: 'saving' } : prev,
      );
      updateTask(
        {
          taskId: task.id,
          data: {
            version: task.version,
            action: TASK_ACTION.SAVE_CONTENT,
            content: formValues,
          },
          silent: true,
        },
        {
          onSuccess: () =>
            setDraftState((prev) =>
              prev?.taskId === task.id ? { ...prev, saveState: 'saved' } : prev,
            ),
          onError: () =>
            setDraftState((prev) =>
              prev?.taskId === task.id ? { ...prev, saveState: 'dirty' } : prev,
            ),
        },
      );
    }, DRAFT_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (draftAutoSaveTimerRef.current) {
        clearTimeout(draftAutoSaveTimerRef.current);
      }
    };
  }, [enableAutosave, formValues, hasDraft, hasUnsavedDraftChanges, isReadOnly, task.id, task.version, updateTask]);

  useEffect(() => {
    return () => {
      if (draftAutoSaveTimerRef.current) {
        clearTimeout(draftAutoSaveTimerRef.current);
      }
    };
  }, []);

  const handleRunAction = (action: keyof typeof TASK_ACTION) => {
    if (draftAutoSaveTimerRef.current) {
      clearTimeout(draftAutoSaveTimerRef.current);
      draftAutoSaveTimerRef.current = null;
    }

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

    const nextContent = currentDraft?.content ?? task.content;
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
    setDraftState({ taskId: task.id, content: values, saveState: 'dirty' });
  };

  const handleUploadQcScreenshot = async () => {
    if (!selectedUploadFile) {
      return;
    }

    setIsUploading(true);
    try {
      if (!isSupportedQcMimeType(selectedUploadFile.type)) {
        throw new Error('Only JPEG, PNG, and WEBP files are supported');
      }

      const presigned = await requestPresignedUpload({
        use_case: FILE_UPLOAD_USE_CASE.QC_SCREENSHOT,
        mime_type: selectedUploadFile.type,
        file_size: selectedUploadFile.size,
        file_name: selectedUploadFile.name,
      });

      await uploadFileToPresignedUrl(presigned, selectedUploadFile);

      const nextUrls = uploadedQcScreenshots.includes(presigned.file_url)
        ? uploadedQcScreenshots
        : [...uploadedQcScreenshots, presigned.file_url];
      const nextContent = {
        ...formValues,
        [QC_UPLOAD_CONTENT_KEY]: nextUrls,
      };

      setDraftState({ taskId: task.id, content: nextContent, saveState: 'saving' });
      await updateTaskAsync({
        taskId: task.id,
        data: {
          version: task.version,
          action: TASK_ACTION.SAVE_CONTENT,
          content: nextContent,
        },
        silent: true,
      });

      setDraftState({ taskId: task.id, content: nextContent, saveState: 'saved' });
      setUploadSelection({ taskId: task.id, file: null });
      toast.success('QC screenshot uploaded');
    } catch (error) {
      setDraftState((prev) =>
        prev?.taskId === task.id ? { ...prev, saveState: 'dirty' } : prev,
      );
      toast.error(error instanceof Error ? error.message : 'Failed to upload screenshot');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
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
          <div className="mb-4 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Task Checklist</h4>
            {!isReadOnly && enableAutosave && (
              <span className="text-xs text-muted-foreground">
                {draftSaveState === 'saving' && 'Saving draft...'}
                {draftSaveState === 'saved' && !hasUnsavedDraftChanges && 'Draft saved'}
                {draftSaveState === 'dirty' && 'Unsaved changes'}
              </span>
            )}
          </div>
          {progress && progress.total > 0 && (
            <div className="mb-4 rounded-md border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Progress
                  {' '}
                  {progress.completed}
                  /
                  {progress.total}
                </span>
                <span className="font-medium text-foreground">
                  {progress.percentage}
                  %
                </span>
              </div>
              <ProgressBar
                value={progress.percentage}
                className="h-1.5"
                indicatorClassName={progress.percentage === 100 ? 'bg-emerald-500' : 'bg-primary'}
              />
            </div>
          )}
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

        <div className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">QC Screenshots</h4>
          </div>

          {uploadedQcScreenshots.length > 0 && (
            <div className="space-y-2">
              {uploadedQcScreenshots.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm text-primary hover:underline"
                >
                  {url}
                </a>
              ))}
            </div>
          )}

          {!isReadOnly && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setUploadSelection({ taskId: task.id, file });
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!selectedUploadFile || isUploading}
                onClick={() => {
                  void handleUploadQcScreenshot();
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
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
    </>
  );
}

export function TaskExecutionSheet({
  task,
  onClose,
  studioId: _studioId,
  enableAutosave = false,
}: TaskExecutionSheetProps) {
  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-slate-50">
        {task && (
          <TaskExecutionSheetInner
            task={task}
            onClose={onClose}
            enableAutosave={enableAutosave}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
