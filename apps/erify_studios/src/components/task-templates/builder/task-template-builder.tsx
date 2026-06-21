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
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ChevronsUpDown, Plus, RefreshCw } from 'lucide-react';
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { createTaskTemplateFieldId, getSchemaEngine } from '@eridu/api-types/task-management';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AsyncCombobox,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@eridu/ui';
import { useIsMobile } from '@eridu/ui/hooks/use-is-mobile';

import { LivePreview } from './live-preview';
import { ModerationLoopCard } from './moderation-loop-card';
import type { FieldItem, LoopMetadata, TemplateSchemaType } from './schema';
import { SharedFieldInserter } from './shared-field-inserter';
import { SortableFieldList } from './sortable-field-list';
import type { TaskTemplateBuilderProps } from './task-template-builder.types';
import {
  buildLoopMetadataFromTemplate,
  createNextLoop,
  createTextFieldForTemplate,
  createUniqueCopiedKey,
  createUniqueSharedFieldKey,
  DEFAULT_LOOP_DURATION_MIN,
  EMPTY_SHARED_FIELDS,
  formatTotalLoopDuration,
  omitLoopsFromMetadata,
  stripSourceLoopSuffix,
} from './task-template-builder.utils';

import { useClientMechanicsQuery } from '@/features/client-mechanics/api/get-client-mechanics';
import { getClients } from '@/features/clients/api/get-clients';
import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';
import { getTaskTypeLabel } from '@/lib/constants/task-type-labels';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export type { TaskTemplateBuilderProps } from './task-template-builder.types';

/**
 * Two-column task-template builder (editor + live preview). This component is
 * the composition root and the single owner of all builder state, derivations,
 * and template mutations; the extracted pieces are pure presentation:
 *
 *   TaskTemplateBuilder (state + derivations + onChange mutations)
 *   ├─ SharedFieldInserter ...... shared-field empty-state / picker + preview
 *   ├─ ModerationLoopCard[] ..... per-loop editor (moderation mode)
 *   ├─ SortableFieldList ........ flat field list (standard mode)
 *   └─ LivePreview .............. deferred render of the working template
 *
 * Every mutation flows through `onChange`; the latest `template`/`onChange` are
 * held in `propsRef` so callbacks stay stable. Pure helpers, constants, and the
 * props type live in the sibling `task-template-builder.utils.ts` / `.types.ts`.
 */
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
  const isMobile = useIsMobile();

  const [clientSearch, setClientSearch] = useState('');
  const { data: lookups } = useShowLookupsQuery(studioId ?? '');
  const { data: clientsResponse, isLoading: isClientsLoading } = useQuery({
    queryKey: ['builder-clients', studioId, clientSearch],
    queryFn: ({ signal }) => getClients({ name: clientSearch || undefined, limit: 50 }, studioId ?? '', { signal }),
    enabled: Boolean(studioId),
  });

  const { data: clientMechanicsResponse, isLoading: isClientMechanicsLoading } = useClientMechanicsQuery(
    studioId ?? '',
    template.client_id ?? undefined,
    { limit: 200 },
  );

  const clientMechanics = useMemo(() => clientMechanicsResponse?.data ?? [], [clientMechanicsResponse]);

  const activeMechanics = useMemo(() => {
    return clientMechanics.filter((m) => m.status === 'active');
  }, [clientMechanics]);

  const hasSupersededRefs = useMemo(() => {
    return template.items.some((item) => {
      if (!item.mechanic_ref)
        return false;
      const m = clientMechanics.find((mc) => mc.id === item.mechanic_ref?.mechanic_id);
      return m && m.content_revision > item.mechanic_ref.content_revision;
    });
  }, [template.items, clientMechanics]);

  const hasRetiredRefs = useMemo(() => {
    return template.items.some((item) => {
      if (!item.mechanic_ref)
        return false;
      const m = clientMechanics.find((mc) => mc.id === item.mechanic_ref?.mechanic_id);
      return m ? m.status === 'retired' : false;
    });
  }, [template.items, clientMechanics]);

  const handleUpgradeAllMechanics = useCallback(() => {
    const upgradedItems = template.items.map((item) => {
      if (!item.mechanic_ref)
        return item;
      const m = clientMechanics.find((mc) => mc.id === item.mechanic_ref?.mechanic_id);
      if (m && m.content_revision > item.mechanic_ref.content_revision) {
        return {
          ...item,
          label: m.instruction_label,
          description: m.instruction_body,
          mechanic_ref: {
            ...item.mechanic_ref,
            content_revision: m.content_revision,
          },
        };
      }
      return item;
    });
    onChange({ ...template, items: upgradedItems });
    toast.success('Successfully upgraded all mechanic references to the latest catalog revision');
  }, [template, clientMechanics, onChange]);

  const selectedClient = useMemo(() => {
    return (lookups?.clients ?? []).find((c) => c.id === template.client_id);
  }, [lookups?.clients, template.client_id]);

  const clientOptions = useMemo(() => {
    const fetched = (clientsResponse?.data ?? []).map((c) => ({ value: c.id, label: c.name }));
    if (selectedClient && !fetched.some((opt) => opt.value === selectedClient.id)) {
      fetched.unshift({ value: selectedClient.id, label: selectedClient.name });
    }
    return fetched;
  }, [clientsResponse, selectedClient]);

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
    const newField = createTextFieldForTemplate(currentTemplate);
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
              <div className="grid gap-2">
                <Label htmlFor="client-select">Client Mapping (Optional)</Label>
                <AsyncCombobox
                  value={template.client_id || ''}
                  onChange={(val) => {
                    startTransition(() => {
                      const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                      currentOnChange({ ...currentTemplate, client_id: val || null });
                    });
                  }}
                  onSearch={setClientSearch}
                  options={clientOptions}
                  isLoading={isClientsLoading}
                  placeholder="Studio scoped — select client to bind"
                />
                <span className="text-[11px] text-muted-foreground">
                  Binding a template to a client allows restricting the mechanic catalog items and rules for that client.
                </span>
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

        <SharedFieldInserter
          activeSharedFields={activeSharedFields}
          studioId={studioId}
          canManageSharedFields={canManageSharedFields}
          isModerationMode={isModerationMode}
          moderationLoops={moderationLoops}
          resolvedSharedFieldKey={resolvedSharedFieldKey}
          resolvedSharedFieldLoopId={resolvedSharedFieldLoopId}
          insertionPreview={sharedFieldInsertionPreview}
          onSelectSharedField={setSelectedSharedFieldKey}
          onSelectLoop={setSelectedSharedFieldLoopId}
          onAddSharedField={addSharedField}
        />

        <div className="flex-1 min-h-0 overflow-visible lg:overflow-y-auto lg:pr-2">
          {isModerationMode
            ? (
                <div className="space-y-6 pb-6">
                  {/* Loop × Mechanic Matrix Grid — the grid is wide and not usable on small
                      viewports, so mobile always falls back to Cards (mechanic fields still
                      render there, read-only, via field-editor's isMechanicField gate). */}
                  {template.client_id && !isClientMechanicsLoading && activeMechanics.length === 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      {clientMechanics.length === 0
                        ? 'This client has no mechanics in the catalog yet. Create at least one active mechanic under Client Mechanics for this client to assign it here.'
                        : 'This client\'s mechanics are all retired. Reactivate or create one under Client Mechanics for this client to assign it here.'}
                    </p>
                  )}
                  {template.client_id && activeMechanics.length > 0 && isMobile && (
                    <p className="text-xs text-muted-foreground bg-muted/50 border rounded px-3 py-2">
                      Assigning mechanics to loops requires a larger screen. Switch to a tablet or
                      desktop to use the Client Mechanics Matrix.
                    </p>
                  )}
                  {template.client_id && activeMechanics.length > 0 && !isMobile && (
                    <Card className="border shadow-sm bg-gradient-to-br from-white to-zinc-50/50">
                      <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <CardTitle className="text-sm font-semibold tracking-tight">
                            Client Mechanics Matrix
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Assign client mechanics to loops. Checked mechanics will be added as checkbox inputs.
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {hasRetiredRefs && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              Some assigned mechanics are retired. Check cards below.
                            </div>
                          )}
                          {hasSupersededRefs && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 flex items-center gap-1 shrink-0 h-8"
                              onClick={handleUpgradeAllMechanics}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              {' '}
                              Upgrade All References
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 border-t">
                        <div className="overflow-x-auto max-w-full">
                          <Table className="min-w-full divide-y divide-border table-fixed">
                            <TableHeader className="bg-zinc-50/75">
                              <TableRow>
                                <TableHead className="w-48 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider py-3 px-4">
                                  Loop
                                </TableHead>
                                {activeMechanics.map((mechanic) => (
                                  <TableHead key={mechanic.id} className="text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider py-3 px-2">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="cursor-help underline decoration-dotted underline-offset-4">
                                            {mechanic.title}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs p-2.5">
                                          <p className="font-semibold text-xs mb-1">{mechanic.instruction_label}</p>
                                          <p className="text-[11px] text-muted-foreground leading-normal">{mechanic.instruction_body}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody className="bg-white divide-y divide-border">
                              {moderationLoops.map((loop) => (
                                <TableRow key={loop.id} className="hover:bg-zinc-50/50">
                                  <TableCell className="font-medium text-sm text-zinc-900 py-3.5 px-4 truncate">
                                    {loop.name}
                                  </TableCell>
                                  {activeMechanics.map((mechanic) => {
                                    const assignedField = template.items.find(
                                      (item) => item.group === loop.id && item.mechanic_ref?.mechanic_id === mechanic.id,
                                    );
                                    const isChecked = !!assignedField;
                                    const isSuperseded = assignedField && mechanic.content_revision > (assignedField.mechanic_ref?.content_revision ?? 0);

                                    return (
                                      <TableCell key={mechanic.id} className="text-center py-3.5 px-2">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <Checkbox
                                            checked={isChecked}
                                            aria-label={`Toggle ${mechanic.title} for ${loop.name}`}
                                            onCheckedChange={(checked) => {
                                              const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                                              if (checked) {
                                                // Add mechanic field. v1 requires globally-unique
                                                // keys, so the same mechanic checked into a second
                                                // loop needs a loop-scoped key; v2 identity is via
                                                // `id`, so the canonical key can repeat across loops
                                                // (mirrors the shared-field insertion handler above).
                                                const engine = getSchemaEngine(currentTemplate);
                                                const isV2 = engine === 'task_template_v2';
                                                const baseKey = mechanic.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                                                const usedKeys = new Set(currentTemplate.items.map((item) => item.key));
                                                const itemKey = isV2 ? baseKey : createUniqueSharedFieldKey(baseKey, usedKeys, loop.id);
                                                const newField: FieldItem = {
                                                  id: createTaskTemplateFieldId(),
                                                  key: itemKey,
                                                  type: 'checkbox' as any,
                                                  label: mechanic.instruction_label,
                                                  description: mechanic.instruction_body,
                                                  required: true,
                                                  group: loop.id,
                                                  mechanic_ref: {
                                                    client_id: currentTemplate.client_id!,
                                                    mechanic_id: mechanic.id,
                                                    content_revision: mechanic.content_revision,
                                                  },
                                                };
                                                const updatedItems = [...currentTemplate.items, newField];
                                                currentOnChange({ ...currentTemplate, items: updatedItems });
                                                toast.success(`Assigned mechanic "${mechanic.title}" to ${loop.name}`);
                                              } else {
                                                // Remove mechanic field
                                                const updatedItems = currentTemplate.items.filter(
                                                  (item) => !(item.group === loop.id && item.mechanic_ref?.mechanic_id === mechanic.id),
                                                );
                                                currentOnChange({ ...currentTemplate, items: updatedItems });
                                                toast.success(`Removed mechanic "${mechanic.title}" from ${loop.name}`);
                                              }
                                            }}
                                          />
                                          {isSuperseded && (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                                    onClick={() => {
                                                      const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                                                      const updatedItems = currentTemplate.items.map((item) => {
                                                        if (item.group === loop.id && item.mechanic_ref?.mechanic_id === mechanic.id) {
                                                          return {
                                                            ...item,
                                                            label: mechanic.instruction_label,
                                                            description: mechanic.instruction_body,
                                                            mechanic_ref: {
                                                              ...item.mechanic_ref,
                                                              content_revision: mechanic.content_revision,
                                                            },
                                                          };
                                                        }
                                                        return item;
                                                      });
                                                      currentOnChange({ ...currentTemplate, items: updatedItems });
                                                      toast.success(`Upgraded mechanic "${mechanic.title}" reference in ${loop.name}`);
                                                    }}
                                                  >
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="p-2 text-xs">
                                                  Catalog update available. Click to upgrade.
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          )}
                                        </div>
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {moderationLoops.map((loop, loopIndex) => {
                    const loopItems = loopItemsById[loop.id] || emptyLoopItems;
                    const isCollapsed = collapsedLoops[loop.id] ?? false;
                    return (
                      <ModerationLoopCard
                        key={loop.id}
                        loop={loop}
                        loopIndex={loopIndex}
                        loopItems={loopItems}
                        loopCount={moderationLoops.length}
                        isCollapsed={isCollapsed}
                        templateItems={template.items}
                        errors={errors}
                        sensors={sensors}
                        setCardRef={(node) => {
                          loopCardRefs.current[loop.id] = node;
                        }}
                        onToggleCollapse={() => {
                          setCollapsedLoops((prev) => ({
                            ...prev,
                            [loop.id]: !(prev[loop.id] ?? false),
                          }));
                        }}
                        onClone={() => {
                          const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                          const engine = getSchemaEngine(currentTemplate);
                          const sourceLoopItems = currentTemplate.items.filter((item) => item.group === loop.id);

                          if (engine === 'task_template_v1' && sourceLoopItems.some((item) => 'standard' in item && item.standard)) {
                            toast.error(
                              'Shared fields can\'t be cloned on this template version. Add a new loop and use the shared field picker instead.',
                            );
                            return;
                          }

                          const nextLoopBase = createNextLoop(moderationLoops);
                          const clonedLoop: LoopMetadata = {
                            ...nextLoopBase,
                            name: `${loop.name} (Copy)`,
                            durationMin: loop.durationMin,
                          };

                          const nextLoops = [...moderationLoops, clonedLoop];
                          const usedKeys = new Set(currentTemplate.items.map((item) => item.key));
                          // When cloning a v2 loop, suffixed legacy values like
                          // `shared_field_key: "ads_cost_l12"` would project the cloned
                          // loop to a broken column ("ads_cost_l12_l13"). Strip the
                          // source-loop suffix so the canonical base is what gets
                          // re-grouped — descriptor logic then attaches the new loop
                          // suffix correctly.
                          const clonedItems = sourceLoopItems.map((item) => {
                            if (engine === 'task_template_v2') {
                              const cloned = structuredClone(item);
                              cloned.id = createTaskTemplateFieldId();
                              cloned.key = stripSourceLoopSuffix(cloned.key, item.group) ?? cloned.key;
                              const sourceSharedKey = (cloned as { shared_field_key?: string }).shared_field_key;
                              if (sourceSharedKey) {
                                (cloned as { shared_field_key?: string }).shared_field_key = stripSourceLoopSuffix(sourceSharedKey, item.group);
                              }
                              cloned.group = clonedLoop.id;
                              return cloned;
                            }
                            return {
                              ...structuredClone(item),
                              id: crypto.randomUUID(),
                              key: createUniqueCopiedKey(item.key, usedKeys),
                              group: clonedLoop.id,
                            };
                          });

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
                        onRemove={() => {
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
                        onRenameLoop={(newName) => {
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
                        onDurationChange={(rawValue) => {
                          const parsed = Number.parseInt(rawValue, 10);
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
                        onReorder={(value) => {
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
                        onAddField={() => {
                          const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                          const newField = createTextFieldForTemplate(currentTemplate, loop.id);
                          currentOnChange({
                            ...currentTemplate,
                            items: [...currentTemplate.items, newField],
                          });
                        }}
                        onDragEnd={handleDragEnd}
                        onUpdateField={updateField}
                        onRemoveField={removeField}
                        clientMechanics={clientMechanics}
                      />
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
                        clientMechanics={clientMechanics}
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
