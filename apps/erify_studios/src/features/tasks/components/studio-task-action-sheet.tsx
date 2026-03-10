import { useQuery } from '@tanstack/react-query';
import { del, get, set } from 'idb-keyval';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  TASK_ACTION,
  type TaskAction,
  type TaskWithRelationsDto,
} from '@eridu/api-types/task-management';
import {
  Button,
  Label,
  Progress,
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
import { resolveUiSchema } from '@/features/tasks/lib/resolve-ui-schema';

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
    options?: {
      onSuccess?: () => void;
    },
  ) => void;
};

const DEFAULT_UPLOAD_STATE: JsonFormUploadState = {
  hasPendingUploads: false,
  hasBlockingIssues: false,
  isPreparingUploads: false,
  blockingMessages: [],
};
const TASK_ACTION_DRAFT_PREFIX = 'studio_task_action_draft';
const DRAFT_SAVE_DEBOUNCE_MS = 500;
const DEFAULT_LOOP_DURATION_MIN = 15;

type TaskActionDraftCache = {
  taskId: string;
  action: TaskAction;
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

function getTaskActionDraftKey(taskId: string, action: TaskAction): string {
  return `${TASK_ACTION_DRAFT_PREFIX}:${taskId}:${action}`;
}

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
  const draftKey = useMemo(() => {
    if (!taskId || !action) {
      return null;
    }
    return getTaskActionDraftKey(taskId, action);
  }, [action, taskId]);
  const requiresContent = action === TASK_ACTION.SUBMIT_FOR_REVIEW || action === TASK_ACTION.APPROVE_COMPLETED;
  const requiresNote = action === TASK_ACTION.CONTINUE_EDITING || action === TASK_ACTION.MARK_BLOCKED;
  const [isLoadingDraft, setIsLoadingDraft] = useState(() => Boolean(open && requiresContent));
  const [isDraftHydrated, setIsDraftHydrated] = useState(() => !requiresContent);
  const [draftBaseVersion, setDraftBaseVersion] = useState<number | null>(null);
  const [draftBaseContent, setDraftBaseContent] = useState<Record<string, unknown> | null>(null);
  const hasPreparingUploads = requiresContent && uploadState.isPreparingUploads;
  const hasUploadValidationIssues = requiresContent && uploadState.hasBlockingIssues && !uploadState.isPreparingUploads;
  const { data: taskDetail, isLoading: isLoadingTask } = useQuery({
    queryKey: taskId ? studioTaskKeys.detail(studioId, taskId) : studioTaskKeys.all,
    queryFn: () => getStudioTask(studioId, taskId!),
    enabled: open && requiresContent && !!studioId && !!taskId,
    refetchOnWindowFocus: false,
  });
  const resolvedTask = taskDetail ?? task;
  const schema = resolvedTask?.snapshot?.schema
    ? resolveUiSchema(resolvedTask.snapshot.schema)
    : null;
  const loopTabs = useMemo<LoopTab[]>(() => {
    if (!schema) {
      return [];
    }

    const groups = Array.from(new Set(schema.items.map((item) => item.group).filter((group): group is string => !!group)));
    if (groups.length === 0) {
      return [];
    }

    const metadataLoops = schema.metadata?.loops;
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
  }, [schema]);
  const [activeGroup, setActiveGroup] = useState<string | undefined>(undefined);
  const resolvedActiveGroup = useMemo(() => {
    if (loopTabs.length === 0) {
      return undefined;
    }
    if (activeGroup && loopTabs.some((loop) => loop.id === activeGroup)) {
      return activeGroup;
    }
    return loopTabs[0].id;
  }, [activeGroup, loopTabs]);
  const content = useMemo(
    () => (isDirty ? (contentDraft ?? {}) : ((resolvedTask?.content as Record<string, unknown> | null) ?? {})),
    [contentDraft, isDirty, resolvedTask?.content],
  );
  const loopProgressById = useMemo<Record<string, LoopProgress>>(() => {
    if (!schema) {
      return {};
    }

    return schema.items.reduce<Record<string, LoopProgress>>((acc, item) => {
      if (!item.group) {
        return acc;
      }

      if (!acc[item.group]) {
        acc[item.group] = { completed: 0, total: 0 };
      }

      const current = acc[item.group];
      current.total += 1;
      const value = content[item.key];
      const isCompleted = value !== undefined && value !== null && (typeof value !== 'string' || value.trim().length > 0);
      if (isCompleted) {
        current.completed += 1;
      }

      return acc;
    }, {});
  }, [content, schema]);
  const activeLoopIndex = loopTabs.findIndex((loop) => loop.id === resolvedActiveGroup);
  const activeLoop = activeLoopIndex >= 0 ? loopTabs[activeLoopIndex] : undefined;
  const loopStepProgress = loopTabs.length > 0 && activeLoopIndex >= 0
    ? ((activeLoopIndex + 1) / loopTabs.length) * 100
    : 0;
  const resolvedTaskContent = useMemo(
    () => ((resolvedTask?.content as Record<string, unknown> | null) ?? {}),
    [resolvedTask?.content],
  );
  const contentString = useMemo(() => JSON.stringify(content), [content]);
  const resolvedTaskContentString = useMemo(() => JSON.stringify(resolvedTaskContent), [resolvedTaskContent]);
  const hasUnsavedDraftChanges = contentString !== resolvedTaskContentString;
  const hasDraftMismatch = Boolean(
    resolvedTask
    && draftBaseVersion !== null
    && draftBaseContent !== null
    && (resolvedTask.version !== draftBaseVersion
      || JSON.stringify(draftBaseContent) !== resolvedTaskContentString),
  );

  const title = getActionTitle(action);

  useEffect(() => {
    if (!open || !requiresContent || !resolvedTask || !action || !draftKey || isDraftHydrated) {
      return;
    }

    let isCancelled = false;

    void get<TaskActionDraftCache>(draftKey)
      .then((saved) => {
        if (isCancelled) {
          return;
        }
        if (!saved || saved.taskId !== resolvedTask.id || saved.action !== action) {
          setDraftBaseVersion(resolvedTask.version);
          setDraftBaseContent(resolvedTaskContent);
          return;
        }

        setContentDraft(saved.content);
        setIsDirty(true);
        setDraftBaseVersion(saved.baseVersion);
        setDraftBaseContent(saved.baseContent);
      })
      .catch(() => {
        setDraftBaseVersion(resolvedTask.version);
        setDraftBaseContent(resolvedTaskContent);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingDraft(false);
          setIsDraftHydrated(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [action, draftKey, isDraftHydrated, open, requiresContent, resolvedTask, resolvedTaskContent]);

  useEffect(() => {
    if (!open || !requiresContent || !resolvedTask || !action || !draftKey || !isDraftHydrated) {
      return;
    }
    if (!isDirty && !hasUnsavedDraftChanges) {
      return;
    }

    const timer = setTimeout(() => {
      const baseVersion = draftBaseVersion ?? resolvedTask.version;
      const baseContent = draftBaseContent ?? resolvedTaskContent;
      const payload: TaskActionDraftCache = {
        taskId: resolvedTask.id,
        action,
        content,
        baseContent,
        baseVersion,
        updatedAt: new Date().toISOString(),
      };
      void set(draftKey, payload);
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [
    action,
    content,
    draftBaseContent,
    draftBaseVersion,
    draftKey,
    hasUnsavedDraftChanges,
    isDirty,
    isDraftHydrated,
    open,
    requiresContent,
    resolvedTask,
    resolvedTaskContent,
  ]);

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
                    <>
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
                      <JsonForm
                        ref={jsonFormRef}
                        schema={schema}
                        values={content}
                        activeGroup={loopTabs.length > 0 ? resolvedActiveGroup : undefined}
                        uploadTaskId={resolvedTask?.id}
                        onUploadStateChange={setUploadState}
                        onChange={(values) => {
                          setIsDirty(true);
                          setContentDraft(values);
                        }}
                      />
                    </>
                  )
                : (
                    <p className="text-sm text-muted-foreground">
                      This task has no renderable schema. Action will submit current content as-is.
                    </p>
                  )}
              {isLoadingDraft && (
                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  Loading saved draft from this device...
                </p>
              )}
              {!isLoadingDraft && hasUnsavedDraftChanges && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  You have unsaved local changes stored in IndexedDB.
                </p>
              )}
              {!isLoadingDraft && hasDraftMismatch && (
                <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                  Local draft and server task content are different. Local draft is kept so you can review and edit.
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
                  await jsonFormRef.current.validateBeforeSubmit();
                  nextContent = await jsonFormRef.current.flushPendingFileUploads();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Failed to upload pending files');
                  setIsPreparingSubmit(false);
                  return;
                }
              }
              const noteValue = requiresNote ? note.trim() : undefined;
              onSubmit(
                resolvedTask,
                action,
                requiresContent ? nextContent : undefined,
                noteValue,
                {
                  onSuccess: () => {
                    if (requiresContent) {
                      jsonFormRef.current?.clearUploadedFileCache();
                    }
                    if (requiresContent && draftKey) {
                      void del(draftKey).catch(() => undefined);
                    }
                  },
                },
              );
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
