import { format } from 'date-fns';
import { del, get, set } from 'idb-keyval';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebounceCallback } from 'usehooks-ts';

import type { TaskStatus, TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { TASK_ACTION, TASK_STATUS } from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  Progress,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@eridu/ui';

import { useUpdateMyTask } from '../hooks/use-update-my-task';
import { calculateTaskProgress, isFieldComplete } from '../lib/progress';
import { resolveUiSchema } from '../lib/resolve-ui-schema';

import type { JsonFormHandle, JsonFormUploadState } from '@/components/json-form/json-form';
import { JsonForm } from '@/components/json-form/json-form';
import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';

type TaskExecutionSheetProps = {
  task: TaskWithRelationsDto | null;
  onClose: () => void;
  studioId: string;
  enableAutosave?: boolean;
};

const DRAFT_AUTOSAVE_DEBOUNCE_MS = 650;
const LOCAL_DRAFT_SAVE_DEBOUNCE_MS = 500;
const LOOP_CLOCK_TICK_MS = 30_000;
const DEFAULT_LOOP_DURATION_MIN = 15;
const MY_TASK_EXECUTION_DRAFT_PREFIX = 'my_task_execution_draft';
type DraftSaveState = 'idle' | 'dirty' | 'saving' | 'saved';

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

type TaskExecutionDraftCache = {
  taskId: string;
  content: Record<string, unknown>;
  baseContent: Record<string, unknown>;
  baseVersion: number;
  updatedAt: string;
};

type LoopTab = {
  id: string;
  name: string;
  durationMin: number;
};

type LoopProgress = {
  completed: number;
  total: number;
};

const DEFAULT_UPLOAD_STATE: JsonFormUploadState = {
  hasPendingUploads: false,
  hasBlockingIssues: false,
  isPreparingUploads: false,
  blockingMessages: [],
};

function getTaskExecutionDraftKey(taskId: string): string {
  return `${MY_TASK_EXECUTION_DRAFT_PREFIX}:${taskId}`;
}

function TaskExecutionSheetInner({ task, onClose, enableAutosave }: TaskExecutionSheetInnerProps) {
  const { mutateAsync: updateTaskAsync } = useUpdateMyTask();
  // Keyed by taskId — automatically "resets" when task changes without needing an effect
  const [draftState, setDraftState] = useState<DraftStateEntry | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [uploadState, setUploadState] = useState<JsonFormUploadState>(DEFAULT_UPLOAD_STATE);
  const draftAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jsonFormRef = useRef<JsonFormHandle>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());

  // currentDraft is null whenever the stored draft belongs to a different task
  const currentDraft = draftState?.taskId === task.id ? draftState : null;
  const draftSaveState: DraftSaveState = currentDraft?.saveState ?? 'idle';
  const hasDraft = currentDraft !== null;

  const uiSchema = task.snapshot?.schema
    ? resolveUiSchema(task.snapshot.schema)
    : null;
  const draftKey = useMemo(() => getTaskExecutionDraftKey(task.id), [task.id]);
  const showStartTimeMs = task.show?.start_time ? new Date(task.show.start_time).getTime() : null;
  const showStartTime = showStartTimeMs ? new Date(showStartTimeMs) : null;

  const loopTabs = useMemo<LoopTab[]>(() => {
    if (!uiSchema) {
      return [];
    }

    const groups = Array.from(new Set(uiSchema.items.map((item) => item.group).filter((group): group is string => !!group)));
    if (groups.length === 0) {
      return [];
    }

    const metadataLoops = uiSchema.metadata?.loops;

    if (metadataLoops && metadataLoops.length > 0) {
      const filteredLoops = metadataLoops
        .filter((loop) => groups.includes(loop.id))
        .map((loop) => ({
          id: loop.id,
          name: loop.name,
          durationMin: loop.durationMin,
        }));

      if (filteredLoops.length > 0) {
        return filteredLoops;
      }
    }

    return groups.map((group) => ({
      id: group,
      name: group,
      durationMin: DEFAULT_LOOP_DURATION_MIN,
    }));
  }, [uiSchema]);

  const liveLoopId = useMemo(() => {
    if (!showStartTimeMs || loopTabs.length === 0) {
      return undefined;
    }

    const elapsedMinutes = (currentTimeMs - showStartTimeMs) / 60_000;
    if (elapsedMinutes <= 0) {
      return loopTabs[0]?.id;
    }

    let cumulative = 0;
    for (const loop of loopTabs) {
      cumulative += loop.durationMin;
      if (elapsedMinutes < cumulative) {
        return loop.id;
      }
    }

    return loopTabs[loopTabs.length - 1]?.id;
  }, [currentTimeMs, loopTabs, showStartTimeMs]);

  const [activeGroup, setActiveGroup] = useState<string | undefined>(undefined);
  const resolvedActiveGroup = useMemo(() => {
    if (loopTabs.length === 0) {
      return undefined;
    }
    if (activeGroup && loopTabs.some((loop) => loop.id === activeGroup)) {
      return activeGroup;
    }
    return liveLoopId ?? loopTabs[0].id;
  }, [activeGroup, liveLoopId, loopTabs]);

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
  const loopProgressById = useMemo<Record<string, LoopProgress>>(() => {
    if (!uiSchema) {
      return {};
    }

    return uiSchema.items.reduce<Record<string, LoopProgress>>((acc, item) => {
      if (!item.group) {
        return acc;
      }

      if (!acc[item.group]) {
        acc[item.group] = { completed: 0, total: 0 };
      }

      const current = acc[item.group];
      current.total += 1;
      if (isFieldComplete(item.type, formValues[item.key])) {
        current.completed += 1;
      }

      return acc;
    }, {});
  }, [uiSchema, formValues]);
  const activeLoopIndex = loopTabs.findIndex((loop) => loop.id === resolvedActiveGroup);
  const activeLoop = activeLoopIndex >= 0 ? loopTabs[activeLoopIndex] : undefined;
  const loopStepProgress = loopTabs.length > 0 && activeLoopIndex >= 0
    ? ((activeLoopIndex + 1) / loopTabs.length) * 100
    : 0;
  const taskContentString = useMemo(() => JSON.stringify(task.content ?? {}), [task.content]);
  const formValuesString = useMemo(() => JSON.stringify(formValues), [formValues]);
  const hasUnsavedDraftChanges = hasDraft && formValuesString !== taskContentString;

  const rejectionNote = task.metadata?.rejection_note as string | undefined;
  const blockedReason = task.metadata?.blocked_reason as string | undefined;
  const isOverdue = task.due_date ? new Date(task.due_date) < new Date() : false;
  const isSubmitBlockedByShowStart = !!showStartTimeMs
    && (task.type === 'ACTIVE' || task.type === 'CLOSURE')
    && Date.now() < showStartTimeMs;
  const isSubmitBlockedByUploadPreparing = uploadState.isPreparingUploads;
  const isSubmitBlockedByUploadValidation = uploadState.hasBlockingIssues && !uploadState.isPreparingUploads;
  const isSubmitBlockedByUploadIssues = isSubmitBlockedByUploadPreparing || isSubmitBlockedByUploadValidation;

  useEffect(() => {
    let isCancelled = false;

    void get<TaskExecutionDraftCache>(draftKey)
      .then((saved) => {
        if (isCancelled || !saved || saved.taskId !== task.id) {
          return;
        }

        setDraftState({
          taskId: task.id,
          content: saved.content,
          saveState: 'dirty',
        });
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, [draftKey, task.id]);

  useEffect(() => {
    if (!currentDraft || currentDraft.taskId !== task.id || isReadOnly) {
      return;
    }

    if (!hasUnsavedDraftChanges) {
      void del(draftKey).catch(() => undefined);
      return;
    }

    const timer = setTimeout(() => {
      const payload: TaskExecutionDraftCache = {
        taskId: task.id,
        content: currentDraft.content,
        baseContent: (task.content as Record<string, unknown> | null) ?? {},
        baseVersion: task.version,
        updatedAt: new Date().toISOString(),
      };
      void set(draftKey, payload).catch(() => undefined);
    }, LOCAL_DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [currentDraft, draftKey, hasUnsavedDraftChanges, isReadOnly, task.content, task.id, task.version]);

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
      updateTaskAsync(
        {
          taskId: task.id,
          data: {
            version: task.version,
            action: TASK_ACTION.SAVE_CONTENT,
            content: formValues,
          },
          silent: true,
        },
      )
        .then(() =>
          setDraftState((prev) =>
            prev?.taskId === task.id ? { ...prev, saveState: 'saved' } : prev,
          ))
        .catch(() =>
          setDraftState((prev) =>
            prev?.taskId === task.id ? { ...prev, saveState: 'dirty' } : prev,
          ));
    }, DRAFT_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (draftAutoSaveTimerRef.current) {
        clearTimeout(draftAutoSaveTimerRef.current);
      }
    };
  }, [enableAutosave, formValues, hasDraft, hasUnsavedDraftChanges, isReadOnly, task.id, task.version, updateTaskAsync]);

  useEffect(() => {
    return () => {
      if (draftAutoSaveTimerRef.current) {
        clearTimeout(draftAutoSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setUploadState(DEFAULT_UPLOAD_STATE);
  }, [task.id]);

  useEffect(() => {
    if (!showStartTimeMs || loopTabs.length === 0) {
      return;
    }
    const interval = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, LOOP_CLOCK_TICK_MS);
    return () => clearInterval(interval);
  }, [showStartTimeMs, loopTabs.length]);

  const handleRunAction = async (action: keyof typeof TASK_ACTION) => {
    if (isSubmittingAction) {
      return;
    }
    setIsSubmittingAction(true);

    if (draftAutoSaveTimerRef.current) {
      clearTimeout(draftAutoSaveTimerRef.current);
      draftAutoSaveTimerRef.current = null;
    }

    const isSubmitAction = action === 'SUBMIT_FOR_REVIEW' || action === 'APPROVE_COMPLETED';

    if (
      isSubmitAction
      && showStartTimeMs
      && (task.type === 'ACTIVE' || task.type === 'CLOSURE')
      && Date.now() < showStartTimeMs
    ) {
      toast.error(`${getTaskTypeLabel(task.type)} tasks cannot be submitted before show start time.`);
      setIsSubmittingAction(false);
      return;
    }
    if (isSubmitAction && isSubmitBlockedByUploadIssues) {
      toast.error(
        isSubmitBlockedByUploadPreparing
          ? 'Please wait. Images are still being prepared.'
          : (uploadState.blockingMessages[0] ?? 'Please fix file upload issues before submitting'),
      );
      setIsSubmittingAction(false);
      return;
    }

    let nextContent = currentDraft?.content ?? task.content;

    if ((action === 'SUBMIT_FOR_REVIEW' || action === 'APPROVE_COMPLETED') && jsonFormRef.current) {
      try {
        await jsonFormRef.current.validateBeforeSubmit();
        nextContent = await jsonFormRef.current.flushPendingFileUploads();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to upload pending files');
        setIsSubmittingAction(false);
        return;
      }
    }

    try {
      await updateTaskAsync({
        taskId: task.id,
        data: {
          version: task.version,
          action: TASK_ACTION[action],
          ...(nextContent ? { content: nextContent } : {}),
        },
      });
      void del(draftKey).catch(() => undefined);
      setDraftState(null);
      if (action === 'APPROVE_COMPLETED') {
        onClose();
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleFormChange = useDebounceCallback((values: Record<string, unknown>) => {
    setDraftState({ taskId: task.id, content: values, saveState: 'dirty' });
  }, 300);

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
            {!isReadOnly && (enableAutosave || hasDraft) && (
              <span className="text-xs text-muted-foreground">
                {draftSaveState === 'saving' && 'Saving draft...'}
                {draftSaveState === 'saved' && !hasUnsavedDraftChanges && 'Draft saved'}
                {draftSaveState === 'dirty' && (enableAutosave ? 'Unsaved changes' : 'Draft kept locally')}
              </span>
            )}
          </div>

          {loopTabs.length > 0 && (
            <div className="mb-4 rounded-md border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Loop Progress</span>
                <span>
                  {activeLoopIndex + 1}
                  /
                  {loopTabs.length}
                  {' '}
                  loops
                </span>
              </div>
              <Progress value={loopStepProgress} className="h-1.5" />
              <div className="mt-2 rounded-md border bg-background p-2">
                <p className="text-sm font-medium">
                  {activeLoopIndex + 1}
                  .
                  {' '}
                  {activeLoop?.name ?? '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Items completed:
                  {' '}
                  {(activeLoop ? loopProgressById[activeLoop.id]?.completed : 0) ?? 0}
                  /
                  {(activeLoop ? loopProgressById[activeLoop.id]?.total : 0) ?? 0}
                  {liveLoopId && activeLoop && liveLoopId === activeLoop.id ? ' (Live)' : ''}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeLoopIndex <= 0}
                  onClick={() => {
                    if (activeLoopIndex <= 0) {
                      return;
                    }
                    setActiveGroup(loopTabs[activeLoopIndex - 1]?.id);
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeLoopIndex < 0 || activeLoopIndex >= loopTabs.length - 1}
                  onClick={() => {
                    if (activeLoopIndex < 0 || activeLoopIndex >= loopTabs.length - 1) {
                      return;
                    }
                    setActiveGroup(loopTabs[activeLoopIndex + 1]?.id);
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

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
              <Progress
                value={progress.percentage}
                className="h-1.5"
                indicatorClassName={progress.percentage === 100 ? 'bg-emerald-500' : 'bg-primary'}
              />
            </div>
          )}
          {uiSchema
            ? (
                <JsonForm
                  ref={jsonFormRef}
                  schema={uiSchema}
                  values={formValues}
                  onChange={isReadOnly ? undefined : handleFormChange}
                  readOnly={isReadOnly}
                  activeGroup={loopTabs.length > 0 ? resolvedActiveGroup : undefined}
                  uploadTaskId={task.id}
                  onUploadStateChange={setUploadState}
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
        {isSubmitBlockedByShowStart && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This
            {' '}
            {getTaskTypeLabel(task.type)}
            {' '}
            task can be submitted after show start:
            {' '}
            {format(showStartTime!, 'PPP p')}
          </p>
        )}
        {isSubmitBlockedByUploadPreparing && (
          <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Preparing images for upload. Submit will be enabled when finished.
          </p>
        )}
        {isSubmitBlockedByUploadValidation && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {uploadState.blockingMessages[0] ?? 'Please fix file upload issues before submitting.'}
          </p>
        )}
        {(task.status === TASK_STATUS.PENDING || task.status === TASK_STATUS.IN_PROGRESS) && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              void handleRunAction('SUBMIT_FOR_REVIEW');
            }}
            disabled={isSubmittingAction || isSubmitBlockedByShowStart || isSubmitBlockedByUploadIssues}
          >
            <Send className="w-5 h-5 mr-2" />
            {isSubmittingAction
              ? (jsonFormRef.current?.hasPendingFileUploads() ? 'Uploading files...' : 'Submitting...')
              : (isSubmitBlockedByUploadPreparing ? 'Preparing images...' : 'Submit for Review')}
          </Button>
        )}

        {task.status === TASK_STATUS.REVIEW && (
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => {
              void handleRunAction('CONTINUE_EDITING');
            }}
            disabled={isSubmittingAction}
          >
            {isSubmittingAction ? 'Submitting...' : 'Continue Editing'}
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
