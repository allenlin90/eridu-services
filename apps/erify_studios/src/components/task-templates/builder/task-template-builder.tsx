import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Link } from '@tanstack/react-router';
import { AlertCircle, ChevronDown, ChevronsUpDown, Copy, Plus, Trash2 } from 'lucide-react';
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
} from '@eridu/ui';

import { LivePreview } from './live-preview';
import type { FieldItem, LoopMetadata, TemplateSchemaType } from './schema';
import { SortableFieldList } from './sortable-field-list';

import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export type TaskTemplateBuilderProps = {
  template: TemplateSchemaType;
  onChange: (template: TemplateSchemaType) => void;
  onSave?: (data: TemplateSchemaType) => void;
  onCancel?: () => void;
  isSaving?: boolean;
  errors?: Record<string, string[]>;
  sharedFields?: SharedField[];
  studioId?: string;
};

const DEFAULT_LOOP_DURATION_MIN = 15;
const EMPTY_SHARED_FIELDS: SharedField[] = [];

function buildLoopMetadataFromTemplate(template: TemplateSchemaType): LoopMetadata[] {
  const metadataLoops = template.metadata?.loops;
  const normalizedFromMetadata = Array.isArray(metadataLoops)
    ? metadataLoops
        .filter((loop): loop is LoopMetadata => !!loop?.id && !!loop?.name)
        .map((loop) => ({
          id: loop.id,
          name: loop.name,
          durationMin: loop.durationMin > 0 ? loop.durationMin : DEFAULT_LOOP_DURATION_MIN,
        }))
    : [];

  const knownIds = new Set(normalizedFromMetadata.map((loop) => loop.id));
  const fallbackGroups = Array.from(new Set(template.items.map((item) => item.group).filter((group): group is string => !!group)));

  for (const group of fallbackGroups) {
    if (!knownIds.has(group)) {
      normalizedFromMetadata.push({
        id: group,
        name: group,
        durationMin: DEFAULT_LOOP_DURATION_MIN,
      });
    }
  }

  return normalizedFromMetadata;
}

function omitLoopsFromMetadata(metadata: TemplateSchemaType['metadata']): TemplateSchemaType['metadata'] | undefined {
  if (!metadata) {
    return undefined;
  }

  const { loops: _ignored, ...rest } = metadata;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

function createNextLoop(existingLoops: LoopMetadata[]): LoopMetadata {
  const existingIds = new Set(existingLoops.map((loop) => loop.id));
  let ordinal = existingLoops.length + 1;
  let id = `l${ordinal}`;

  while (existingIds.has(id)) {
    ordinal += 1;
    id = `l${ordinal}`;
  }

  return {
    id,
    name: `Loop ${ordinal}`,
    durationMin: DEFAULT_LOOP_DURATION_MIN,
  };
}

function createUniqueCopiedKey(originalKey: string, usedKeys: Set<string>): string {
  const baseWithCopy = originalKey.endsWith('_copy') ? originalKey : `${originalKey}_copy`;
  const normalizedBase = baseWithCopy.slice(0, 50);

  let candidate = normalizedBase;
  let counter = 2;
  while (usedKeys.has(candidate)) {
    const suffix = `_${counter}`;
    candidate = `${normalizedBase.slice(0, 50 - suffix.length)}${suffix}`;
    counter += 1;
  }

  usedKeys.add(candidate);
  return candidate;
}

function createUniqueSharedFieldKey(
  sharedKey: string,
  usedKeys: Set<string>,
  targetLoopId?: string,
): string {
  const preferredBase = targetLoopId ? `${sharedKey}_${targetLoopId}` : sharedKey;
  const normalizedBase = preferredBase.slice(0, 50);

  if (!usedKeys.has(normalizedBase)) {
    usedKeys.add(normalizedBase);
    return normalizedBase;
  }

  let counter = 2;
  let candidate = normalizedBase;
  while (usedKeys.has(candidate)) {
    const suffix = `_${counter}`;
    candidate = `${normalizedBase.slice(0, 50 - suffix.length)}${suffix}`;
    counter += 1;
  }
  usedKeys.add(candidate);
  return candidate;
}

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
  const [collapsedLoops, setCollapsedLoops] = useState<Record<string, boolean>>({});
  const [selectedSharedFieldKey, setSelectedSharedFieldKey] = useState<string>('');
  const [selectedSharedFieldLoopId, setSelectedSharedFieldLoopId] = useState<string>('');
  const { hasAccess } = useStudioAccess(studioId ?? '');

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

  const emptyLoopItems: FieldItem[] = useMemo(() => [], []);
  const loopItemsById = useMemo(() => {
    const record: Record<string, FieldItem[]> = {};
    for (const item of template.items) {
      if (item.group) {
        if (!record[item.group]) {
          record[item.group] = [];
        }
        record[item.group].push(item);
      }
    }
    return record;
  }, [template.items]);

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
  const loopCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    propsRef.current = { template, onChange };
  }, [template, onChange]);

  useEffect(() => {
    if (!pendingFocusLoopId) {
      return;
    }

    const loopExists = moderationLoops.some((loop) => loop.id === pendingFocusLoopId);
    if (!loopExists) {
      return;
    }

    const rafId = requestAnimationFrame(() => {
      loopCardRefs.current[pendingFocusLoopId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPendingFocusLoopId(null);
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [moderationLoops, pendingFocusLoopId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;

    if (over && active.id !== over.id) {
      const oldIndex = currentTemplate.items.findIndex((item) => item.id === active.id);
      const newIndex = currentTemplate.items.findIndex((item) => item.id === over.id);

      currentOnChange({
        ...currentTemplate,
        items: arrayMove(currentTemplate.items, oldIndex, newIndex),
      });
    }
  }, []);

  const addField = useCallback(() => {
    const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
    const newField: FieldItem = {
      id: crypto.randomUUID(),
      key: `field_${Date.now()}`,
      type: 'text',
      label: 'New Question',
      required: true,
    };
    setPendingScrollFieldId(newField.id);

    currentOnChange({
      ...currentTemplate,
      items: [...currentTemplate.items, newField],
    });
  }, []);

  const updateField = useCallback((id: string, updates: Partial<FieldItem>) => {
    const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
    currentOnChange({
      ...currentTemplate,
      items: currentTemplate.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    });
  }, []);

  const removeField = useCallback((id: string) => {
    const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
    currentOnChange({
      ...currentTemplate,
      items: currentTemplate.items.filter((item) => item.id !== id),
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
    const usedKeys = new Set(currentTemplate.items.map((item) => item.key));
    const targetLoopId = isModerationMode ? resolvedSharedFieldLoopId : undefined;
    const itemKey = createUniqueSharedFieldKey(selectedField.key, usedKeys, targetLoopId);
    const isCanonicalSharedKey = itemKey === selectedField.key;
    const newField: FieldItem = {
      id: crypto.randomUUID(),
      key: itemKey,
      type: selectedField.type,
      standard: isCanonicalSharedKey ? true : undefined,
      label: selectedField.label,
      description: selectedField.description,
      required: true,
      ...(targetLoopId ? { group: targetLoopId } : {}),
    };

    setPendingScrollFieldId(newField.id);
    currentOnChange({
      ...currentTemplate,
      items: [...currentTemplate.items, newField],
    });
    if (!isCanonicalSharedKey) {
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
                                <Link to="/studios/$studioId/settings/shared-fields" params={{ studioId }}>
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
          {isModerationMode
            ? (
                <div className="space-y-6 pb-6">
                  {moderationLoops.map((loop, loopIndex) => {
                    const loopItems = loopItemsById[loop.id] || emptyLoopItems;
                    const isCollapsed = collapsedLoops[loop.id] ?? false;
                    return (
                      <div
                        key={loop.id}
                        ref={(node) => {
                          loopCardRefs.current[loop.id] = node;
                        }}
                        className="border rounded-md p-4 space-y-4 bg-muted/10 transition-all"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                Loop
                                {' '}
                                {loopIndex + 1}
                              </span>
                              <span className="inline-flex h-5 items-center rounded-full bg-background px-2 text-[11px] text-muted-foreground">
                                {loopItems.length}
                                {' '}
                                items
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={isCollapsed ? 'Expand loop' : 'Collapse loop'}
                                aria-label={isCollapsed ? 'Expand loop' : 'Collapse loop'}
                                onClick={() => {
                                  setCollapsedLoops((prev) => ({
                                    ...prev,
                                    [loop.id]: !(prev[loop.id] ?? false),
                                  }));
                                }}
                              >
                                <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                <span className="sr-only">{isCollapsed ? 'Expand Loop' : 'Collapse Loop'}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                                title="Clone loop"
                                aria-label="Clone loop"
                                onClick={() => {
                                  const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                                  const nextLoopBase = createNextLoop(moderationLoops);
                                  const clonedLoop: LoopMetadata = {
                                    ...nextLoopBase,
                                    name: `${loop.name} (Copy)`,
                                    durationMin: loop.durationMin,
                                  };

                                  const nextLoops = [...moderationLoops, clonedLoop];
                                  const loopItems = currentTemplate.items.filter((item) => item.group === loop.id);
                                  const usedKeys = new Set(currentTemplate.items.map((item) => item.key));
                                  const clonedItems = loopItems.map((item) => ({
                                    ...structuredClone(item),
                                    id: crypto.randomUUID(),
                                    key: createUniqueCopiedKey(item.key, usedKeys),
                                    group: clonedLoop.id,
                                  }));

                                  currentOnChange({
                                    ...currentTemplate,
                                    metadata: {
                                      ...(currentTemplate.metadata ?? {}),
                                      loops: nextLoops,
                                    },
                                    items: [...currentTemplate.items, ...clonedItems],
                                  });
                                  setCollapsedLoops((prev) => ({ ...prev, [clonedLoop.id]: false }));
                                }}
                              >
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">Clone Loop</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Remove loop"
                                aria-label="Remove loop"
                                onClick={() => {
                                  const newLoops = [...moderationLoops];
                                  newLoops.splice(loopIndex, 1);

                                  const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                                  setCollapsedLoops((prev) => {
                                    const next = { ...prev };
                                    delete next[loop.id];
                                    return next;
                                  });
                                  currentOnChange({
                                    ...currentTemplate,
                                    metadata: newLoops.length > 0
                                      ? {
                                          ...(currentTemplate.metadata ?? {}),
                                          loops: newLoops,
                                        }
                                      : omitLoopsFromMetadata(currentTemplate.metadata),
                                    items: currentTemplate.items.filter((item) => item.group !== loop.id),
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove Loop</span>
                              </Button>
                            </div>
                          </div>

                          <div className="flex min-w-0 flex-wrap items-start gap-3">
                            <div className="min-w-0 flex-1 basis-[220px] space-y-1">
                              <label className="text-[11px] font-medium text-muted-foreground leading-none">Loop Name</label>
                              <Input
                                value={loop.name}
                                onChange={(e) => {
                                  const newName = e.target.value;
                                  const nextLoops = moderationLoops.map((item, i) => (i === loopIndex ? { ...item, name: newName } : item));

                                  const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                                  currentOnChange({
                                    ...currentTemplate,
                                    metadata: {
                                      ...(currentTemplate.metadata ?? {}),
                                      loops: nextLoops,
                                    },
                                  });
                                }}
                                className="font-semibold"
                                placeholder="Loop Name"
                              />
                            </div>
                            <div className="w-[130px] space-y-1">
                              <label className="text-[11px] font-medium text-muted-foreground leading-none">Duration (mins)</label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={loop.durationMin}
                                  onChange={(e) => {
                                    const parsed = Number.parseInt(e.target.value, 10);
                                    const durationMin = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LOOP_DURATION_MIN;
                                    const nextLoops = moderationLoops.map((item, i) => (
                                      i === loopIndex ? { ...item, durationMin } : item
                                    ));

                                    const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                                    currentOnChange({
                                      ...currentTemplate,
                                      metadata: {
                                        ...(currentTemplate.metadata ?? {}),
                                        loops: nextLoops,
                                      },
                                    });
                                  }}
                                  aria-label="Loop duration in minutes"
                                  placeholder="15"
                                  title="How many minutes this loop runs"
                                  className="pr-10"
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-xs text-muted-foreground">
                                  min
                                </span>
                              </div>
                            </div>
                            <div className="w-[140px] space-y-1">
                              <label className="text-[11px] font-medium text-muted-foreground leading-none">Position</label>
                              <Select
                                value={String(loopIndex + 1)}
                                onValueChange={(value) => {
                                  const targetPosition = Number.parseInt(value, 10);
                                  const targetIndex = Number.isFinite(targetPosition) ? targetPosition - 1 : loopIndex;

                                  if (targetIndex === loopIndex || targetIndex < 0 || targetIndex >= moderationLoops.length) {
                                    return;
                                  }

                                  const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                                  const nextLoops = arrayMove(moderationLoops, loopIndex, targetIndex);
                                  currentOnChange({
                                    ...currentTemplate,
                                    metadata: {
                                      ...(currentTemplate.metadata ?? {}),
                                      loops: nextLoops,
                                    },
                                  });
                                }}
                              >
                                <SelectTrigger aria-label="Loop position">
                                  <SelectValue placeholder="Position" />
                                </SelectTrigger>
                                <SelectContent>
                                  {moderationLoops.map((_, index) => (
                                    <SelectItem key={`${loop.id}-position-${index + 1}`} value={String(index + 1)}>
                                      {index + 1}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {!isCollapsed && (
                          <>
                            {loopItems.length === 0 && (
                              <div className="rounded-md border border-dashed bg-background/70 p-3 text-xs text-muted-foreground flex items-center justify-between gap-3">
                                <span>This loop is empty. Add at least one field to make it actionable.</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs shrink-0"
                                  onClick={() => {
                                    const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                                    const newField: FieldItem = {
                                      id: crypto.randomUUID(),
                                      key: `field_${Date.now()}`,
                                      type: 'text',
                                      label: 'New Question',
                                      required: true,
                                      group: loop.id,
                                    };
                                    currentOnChange({
                                      ...currentTemplate,
                                      items: [...currentTemplate.items, newField],
                                    });
                                  }}
                                >
                                  Add First Field
                                </Button>
                              </div>
                            )}

                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                              <SortableContext items={loopItems} strategy={verticalListSortingStrategy}>
                                <SortableFieldList
                                  items={loopItems}
                                  templateItems={template.items}
                                  onUpdate={updateField}
                                  onRemove={removeField}
                                  errors={errors}
                                />
                              </SortableContext>
                            </DndContext>

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-dashed"
                              onClick={() => {
                                const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                                const newField: FieldItem = {
                                  id: crypto.randomUUID(),
                                  key: `field_${Date.now()}`,
                                  type: 'text',
                                  label: 'New Question',
                                  required: true,
                                  group: loop.id,
                                };
                                currentOnChange({
                                  ...currentTemplate,
                                  items: [...currentTemplate.items, newField],
                                });
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              {' '}
                              Add Field to
                              {' '}
                              Loop
                              {' '}
                              {loopIndex + 1}
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {!moderationLoops.length && (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                      <p>No loops yet. Click "Add Loop" to start building.</p>
                    </div>
                  )}
                </div>
              )
            : (
                <>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={template.items} strategy={verticalListSortingStrategy}>
                      <SortableFieldList
                        items={template.items}
                        templateItems={template.items}
                        onUpdate={updateField}
                        onRemove={removeField}
                        errors={errors}
                        scrollToItemId={pendingScrollFieldId}
                        onScrolledToItem={() => {
                          setPendingScrollFieldId(null);
                        }}
                      />
                    </SortableContext>
                  </DndContext>

                  {!template.items.length && (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                      <p>No fields yet. Click "Add Field" to start building your template.</p>
                    </div>
                  )}
                </>
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
