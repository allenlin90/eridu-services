import { Link } from '@tanstack/react-router';
import { get, set } from 'idb-keyval';
import { AlertCircle, ChevronsUpDown, Plus } from 'lucide-react';
import { lazy, startTransition, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { SharedField } from '@eridu/api-types/task-management';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useIsMobile,
} from '@eridu/ui';

import { LivePreview } from './live-preview';
import type { BuilderTemplateSchemaType, FieldItem, TemplateSchemaType } from './schema';
import { TaskTemplateCardsView } from './task-template-cards-view';
import {
  buildLoopMetadataFromTemplate,
  createNextLoop,
  createTextFieldForTemplate,
  createUniqueSharedFieldKey,
  omitLoopsFromMetadata,
} from './task-template-helpers';

import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

const TaskTemplateLoopGrid = lazy(() => import('./task-template-loop-grid'));

export type TaskTemplateBuilderProps = {
  template: BuilderTemplateSchemaType;
  onChange: (template: BuilderTemplateSchemaType) => void;
  onSave?: (data: BuilderTemplateSchemaType) => void;
  onCancel?: () => void;
  isSaving?: boolean;
  errors?: Record<string, string[]>;
  sharedFields?: SharedField[];
  studioId?: string;
};

const EMPTY_SHARED_FIELDS: SharedField[] = [];

function formatTotalLoopDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${minutes} min${minutes > 1 ? 's' : ''}`;
}

export function TaskTemplateBuilder({
  template,
  onChange,
  onSave,
  onCancel,
  isSaving,
  errors,
  sharedFields = EMPTY_SHARED_FIELDS,
  studioId,
}: TaskTemplateBuilderProps) {
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);
  const [pendingFocusLoopId, setPendingFocusLoopId] = useState<string | null>(null);
  const [pendingScrollFieldId, setPendingScrollFieldId] = useState<string | null>(null);
  const [selectedSharedFieldKey, setSelectedSharedFieldKey] = useState<string>('');
  const [selectedSharedFieldLoopId, setSelectedSharedFieldLoopId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards');
  const { hasAccess } = useStudioAccess(studioId ?? '');
  const isMobile = useIsMobile();

  useEffect(() => {
    get('taskTemplateBuilderView').then((val) => {
      if (val === 'grid' || val === 'cards')
        setViewMode(val);
    });
  }, []);

  const handleViewModeChange = (mode: 'cards' | 'grid') => {
    setViewMode(mode);
    set('taskTemplateBuilderView', mode).catch(console.error);
  };

  const effectiveViewMode = isMobile ? 'cards' : viewMode;

  const isModerationMode = template.items.some((item) => !!item.group) || (template.metadata?.loops?.length ?? 0) > 0;
  const moderationLoops = useMemo(() => {
    return buildLoopMetadataFromTemplate(template);
  }, [template]);
  const activeSharedFields = useMemo(
    () => sharedFields.filter((field) => field.is_active),
    [sharedFields],
  );
  const totalLoopDurationMin = useMemo(
    () => moderationLoops.reduce((sum, loop) => sum + loop.durationMin, 0),
    [moderationLoops],
  );
  const canManageSharedFields = studioId ? hasAccess('sharedFields') : false;

  const [localName, setLocalName] = useState(template.name);
  const [localDescription, setLocalDescription] = useState(template.description || '');

  const [prevName, setPrevName] = useState(template.name);
  const [prevDesc, setPrevDesc] = useState(template.description || '');

  if (template.name !== prevName || (template.description || '') !== prevDesc) {
    setPrevName(template.name);
    setPrevDesc(template.description || '');
    setLocalName(template.name);
    setLocalDescription(template.description || '');
  }

  const resolvedSharedFieldKey = useMemo(() => {
    if (activeSharedFields.length === 0) {
      return '';
    }

    if (selectedSharedFieldKey && activeSharedFields.some((field) => field.key === selectedSharedFieldKey)) {
      return selectedSharedFieldKey;
    }

    return activeSharedFields[0]?.key ?? '';
  }, [activeSharedFields, selectedSharedFieldKey]);

  const resolvedSharedFieldLoopId = useMemo(() => {
    if (!isModerationMode || moderationLoops.length === 0) {
      return undefined;
    }

    if (selectedSharedFieldLoopId && moderationLoops.some((loop) => loop.id === selectedSharedFieldLoopId)) {
      return selectedSharedFieldLoopId;
    }

    return moderationLoops[0]?.id;
  }, [isModerationMode, moderationLoops, selectedSharedFieldLoopId]);
  const sharedFieldInsertionPreview = useMemo(() => {
    const selectedField = activeSharedFields.find((field) => field.key === resolvedSharedFieldKey);
    if (!selectedField) {
      return null;
    }

    if (!isModerationMode || !resolvedSharedFieldLoopId) {
      return {
        title: 'Canonical shared field',
        description: `Adds the shared key "${selectedField.key}" directly. This field stays aligned with studio reporting and can merge across templates.`,
      };
    }

    const previewKey = createUniqueSharedFieldKey(
      selectedField.key,
      new Set(template.items.map((item) => item.key)),
      resolvedSharedFieldLoopId,
    );

    if (previewKey === selectedField.key) {
      return {
        title: 'Canonical shared field',
        description: `Adds the canonical key "${selectedField.key}" to this loop. Report exports can still treat it as the shared studio field.`,
      };
    }

    return {
      title: 'Loop-local copy',
      description: `Adds "${previewKey}" to the selected loop. It keeps the shared field label and type, but it will not merge into the canonical report column "${selectedField.key}".`,
    };
  }, [activeSharedFields, isModerationMode, resolvedSharedFieldKey, resolvedSharedFieldLoopId, template.items]);

  // Defer the template for heavy rendering (preview)
  const deferredTemplate = useDeferredValue(template);

  // Keep latest props in a ref to avoid re-creating callbacks
  const propsRef = useRef({ template, onChange });
  useEffect(() => {
    propsRef.current = { template, onChange };
  }, [template, onChange]);

  const addField = useCallback(() => {
    const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
    const newField = createTextFieldForTemplate(currentTemplate);
    setPendingScrollFieldId(newField.id);

    currentOnChange({
      ...currentTemplate,
      items: [...currentTemplate.items, newField],
    });
  }, []);

  const addSharedField = useCallback(() => {
    if (!resolvedSharedFieldKey) {
      return;
    }

    const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
    const selectedField = activeSharedFields.find((field) => field.key === resolvedSharedFieldKey);
    if (!selectedField) {
      return;
    }
    const engine = getSchemaEngine(currentTemplate);
    const usedKeys = new Set(currentTemplate.items.map((item) => item.key));
    const targetLoopId = isModerationMode ? resolvedSharedFieldLoopId : undefined;

    // For v2, we keep the canonical key and handle grouping separately.
    const isV2 = engine === 'task_template_v2';
    const itemKey = isV2 ? selectedField.key : createUniqueSharedFieldKey(selectedField.key, usedKeys, targetLoopId);

    const newField: FieldItem = isV2
      ? {
          id: createTaskTemplateFieldId(),
          key: itemKey,
          shared_field_key: selectedField.key,
          type: selectedField.type,
          label: selectedField.label,
          description: selectedField.description ?? undefined,
          required: true,
          ...(targetLoopId ? { group: targetLoopId } : {}),
        }
      : {
          id: crypto.randomUUID(),
          key: itemKey,
          type: selectedField.type,
          standard: itemKey === selectedField.key ? true : undefined,
          label: selectedField.label,
          description: selectedField.description ?? undefined,
          required: true,
          ...(targetLoopId ? { group: targetLoopId } : {}),
        };

    setPendingScrollFieldId(newField.id);
    currentOnChange({
      ...currentTemplate,
      items: [...currentTemplate.items, newField],
    });
    if (!isV2 && itemKey !== selectedField.key) {
      toast.info(
        `Added "${selectedField.label}" as loop-scoped key "${itemKey}". Only canonical key "${selectedField.key}" is marked shared.`,
      );
    }
  }, [activeSharedFields, isModerationMode, resolvedSharedFieldKey, resolvedSharedFieldLoopId]);

  const handleWorkflowModeChange = useCallback((nextMode: 'STANDARD' | 'MODERATION') => {
    const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;

    if (nextMode === 'MODERATION') {
      const loops = buildLoopMetadataFromTemplate(currentTemplate);
      const nextLoops = loops.length > 0 ? loops : [createNextLoop([])];
      const defaultLoopId = nextLoops[0]?.id;

      currentOnChange({
        ...currentTemplate,
        task_type: 'ACTIVE',
        metadata: {
          ...(currentTemplate.metadata ?? {}),
          loops: nextLoops,
        },
        items: currentTemplate.items.map((item) => (
          !item.group && defaultLoopId ? { ...item, group: defaultLoopId } : item
        )),
      });
      return;
    }

    currentOnChange({
      ...currentTemplate,
      metadata: omitLoopsFromMetadata(currentTemplate.metadata),
      items: currentTemplate.items.map(({ group: _ignored, ...item }) => item),
    });
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:h-full lg:min-h-0">
      {/* Editor Column */}
      <div className="flex min-h-0 flex-col space-y-6">
        {errors && Object.keys(errors).length > 0 && (
          <div className="px-1">
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Validation Errors</p>
                <div className="text-xs mt-1 text-destructive/90">
                  Please correct the issues below before saving.
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {Object.entries(errors).flatMap(([path, messages]) =>
                      messages.map((msg) => (
                        <li key={`${path}-${msg}`}>
                          {msg}
                        </li>
                      )),
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 p-1">
          <Collapsible
            open={isHeaderOpen}
            onOpenChange={setIsHeaderOpen}
            className="border rounded-lg bg-card"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="font-semibold text-sm">
                {template.name || 'Untitled Template'}
              </h3>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  <ChevronsUpDown className="h-4 w-4" />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="px-4 pb-4 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className={errors?.name ? 'text-destructive' : ''}>
                  Template Name
                </Label>
                <Input
                  id="name"
                  value={localName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalName(val);
                    startTransition(() => {
                      const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                      currentOnChange({ ...currentTemplate, name: val });
                    });
                  }}
                  placeholder="e.g., Pre-Production Checklist"
                  className={errors?.name ? 'border-destructive' : ''}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={localDescription}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalDescription(val);
                    startTransition(() => {
                      const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                      currentOnChange({ ...currentTemplate, description: val });
                    });
                  }}
                  placeholder="Brief description of this template..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-type">Task Type</Label>
                <Select
                  value={template.task_type}
                  onValueChange={(val) => {
                    startTransition(() => {
                      const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                      currentOnChange({ ...currentTemplate, task_type: val as TemplateSchemaType['task_type'] });
                    });
                  }}
                >
                  <SelectTrigger id="task-type">
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SETUP">{getTaskTypeLabel('SETUP')}</SelectItem>
                    <SelectItem value="ACTIVE">{getTaskTypeLabel('ACTIVE')}</SelectItem>
                    <SelectItem value="CLOSURE">{getTaskTypeLabel('CLOSURE')}</SelectItem>
                    <SelectItem value="ADMIN">{getTaskTypeLabel('ADMIN')}</SelectItem>
                    <SelectItem value="ROUTINE">{getTaskTypeLabel('ROUTINE')}</SelectItem>
                    <SelectItem value="OTHER">{getTaskTypeLabel('OTHER')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="workflow-mode">Workflow View</Label>
                <Select
                  value={isModerationMode ? 'MODERATION' : 'STANDARD'}
                  onValueChange={(value) => {
                    handleWorkflowModeChange(value as 'STANDARD' | 'MODERATION');
                  }}
                >
                  <SelectTrigger id="workflow-mode">
                    <SelectValue placeholder="Select workflow view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard checklist</SelectItem>
                    <SelectItem value="MODERATION">Loop-based moderation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isModerationMode && (
                <div className="grid gap-2 hidden lg:grid">
                  <Label>Editor View</Label>
                  <div className="inline-flex shrink-0 rounded-md border bg-background p-1 w-fit">
                    <Button
                      variant={effectiveViewMode === 'cards' ? 'default' : 'ghost'}
                      onClick={() => handleViewModeChange('cards')}
                      size="sm"
                    >
                      Cards
                    </Button>
                    <Button
                      variant={effectiveViewMode === 'grid' ? 'default' : 'ghost'}
                      onClick={() => handleViewModeChange('grid')}
                      size="sm"
                    >
                      Grid
                    </Button>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">
              {isModerationMode ? 'Loops Configuration' : `Fields (${template.items.length})`}
            </h3>
            {isModerationMode && moderationLoops.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Total duration:
                {' '}
                {formatTotalLoopDuration(totalLoopDurationMin)}
              </p>
            )}
          </div>
          <Button
            onClick={() => {
              if (isModerationMode) {
                const nextLoops = [...moderationLoops, createNextLoop(moderationLoops)];
                const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                currentOnChange({
                  ...currentTemplate,
                  metadata: {
                    ...(currentTemplate.metadata ?? {}),
                    loops: nextLoops,
                  },
                });
                setPendingFocusLoopId(nextLoops[nextLoops.length - 1].id);
              } else {
                addField();
              }
            }}
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            {' '}
            {isModerationMode ? 'Add Loop' : 'Add Field'}
          </Button>
        </div>

        {activeSharedFields.length === 0
          ? (
              <div className="rounded-md border border-dashed bg-muted/20 p-4">
                <div className="text-sm font-semibold">No active shared fields yet</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Shared fields power consistent cross-template report columns such as GMV, URLs, and status checkpoints. Create them first, then return here to insert them into the template.
                </div>
                {studioId
                  ? (
                      <div className="mt-3">
                        {canManageSharedFields
                          ? (
                              <Button asChild variant="outline" size="sm">
                                <Link to="/studios/$studioId/shared-fields" params={{ studioId }}>
                                  Open Shared Fields Settings
                                </Link>
                              </Button>
                            )
                          : (
                              <div className="text-sm text-muted-foreground">
                                Ask a studio admin to create shared fields, then return here to insert them into the template.
                              </div>
                            )}
                      </div>
                    )
                  : null}
              </div>
            )
          : null}

        {activeSharedFields.length > 0
          ? (
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-end">
                  <div className="grid flex-1 gap-1.5">
                    <Label className="text-xs">Insert Shared Field</Label>
                    <Select value={resolvedSharedFieldKey} onValueChange={setSelectedSharedFieldKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shared field" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSharedFields.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label}
                            {' '}
                            (
                            {field.key}
                            {' · '}
                            {field.type}
                            )
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isModerationMode && moderationLoops.length > 0 && (
                    <div className="grid gap-1.5 md:w-56">
                      <Label className="text-xs">Target Loop</Label>
                      <Select value={resolvedSharedFieldLoopId} onValueChange={setSelectedSharedFieldLoopId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select loop" />
                        </SelectTrigger>
                        <SelectContent>
                          {moderationLoops.map((loop) => (
                            <SelectItem key={loop.id} value={loop.id}>
                              {loop.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={addSharedField}
                    disabled={!resolvedSharedFieldKey}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Shared Field
                  </Button>
                </div>
                {sharedFieldInsertionPreview
                  ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <div className="rounded-md border bg-background/70 px-3 py-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Insertion preview</div>
                          <div className="mt-1 text-sm font-medium">{sharedFieldInsertionPreview.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{sharedFieldInsertionPreview.description}</div>
                        </div>
                        <div className="rounded-md border bg-background/70 px-3 py-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Authoring rule</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Shared fields always keep the studio-managed label and type. Use canonical shared keys for cross-template reporting, and use loop-local copies only when repeated loop slots need separate answers.
                          </div>
                        </div>
                      </div>
                    )
                  : null}
              </div>
            )
          : null}

        <div className="flex-1 min-h-0 overflow-visible lg:overflow-y-auto lg:pr-2">
          {isModerationMode && effectiveViewMode === 'grid'
            ? (
                <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading grid...</div>}>
                  <TaskTemplateLoopGrid
                    template={template}
                    onChange={(newTemplate) => propsRef.current.onChange(newTemplate)}
                    errors={errors}
                  />
                </Suspense>
              )
            : (
                <TaskTemplateCardsView
                  template={template}
                  onChange={(newTemplate) => propsRef.current.onChange(newTemplate)}
                  errors={errors}
                  isModerationMode={isModerationMode}
                  moderationLoops={moderationLoops}
                  pendingFocusLoopId={pendingFocusLoopId}
                  onScrolledToLoop={() => setPendingFocusLoopId(null)}
                  pendingScrollFieldId={pendingScrollFieldId}
                  onScrolledToField={() => setPendingScrollFieldId(null)}
                />
              )}
        </div>
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => setShowCancelAlert(true)}>Cancel</Button>
          <Button
            onClick={() => {
              onSave?.(template);
            }}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear your current draft and all unsaved changes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onCancel?.();
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Column */}
      <div className="hidden lg:flex min-h-0 flex-col bg-muted/30 rounded-lg border overflow-hidden">
        <div className="p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <h3 className="font-medium flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Live Preview
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <LivePreview template={deferredTemplate} />
        </div>
      </div>
    </div>
  );
}
