import {
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useQuery } from '@tanstack/react-query';
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { createTaskTemplateFieldId, getSchemaEngine } from '@eridu/api-types/task-management';
import { useIsMobile } from '@eridu/ui/hooks/use-is-mobile';

import { ClientMechanicsMatrix } from './client-mechanics-matrix';
import {
  assignMechanicToLoop,
  buildMechanicUpgradePatch,
  removeMechanicFromLoop,
  upgradeAllMechanicReferences,
} from './mechanic-reference.utils';
import { ModerationLoopsList } from './moderation-loops-list';
import type { FieldItem } from './schema';
import { SharedFieldInserter } from './shared-field-inserter';
import type { TaskTemplateBuilderProps } from './task-template-builder.types';
import {
  buildLoopMetadataFromTemplate,
  createNextLoop,
  createTextFieldForTemplate,
  createUniqueSharedFieldKey,
  EMPTY_SHARED_FIELDS,
  formatTotalLoopDuration,
  omitLoopsFromMetadata,
} from './task-template-builder.utils';
import {
  BuilderActions,
  BuilderLivePreview,
  BuilderValidationErrors,
} from './task-template-builder-chrome';
import {
  StandardTemplateFields,
  TaskTemplateFieldsToolbar,
} from './task-template-fields-section';
import { TaskTemplateSettingsCard } from './task-template-settings-card';
import { useModerationLoopActions } from './use-moderation-loop-actions';

import {
  type ClientMechanic,
  useClientMechanicsQuery,
} from '@/features/client-mechanics/api/get-client-mechanics';
import { getClients } from '@/features/clients/api/get-clients';
import { useShowLookupsQuery } from '@/features/shows/api/get-show-lookups';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export type { TaskTemplateBuilderProps } from './task-template-builder.types';

/**
 * Two-column task-template builder (editor + live preview). This component is
 * the composition root and owner of builder state, queries, and shared
 * mutations. Feature-local modules own cohesive rendering and loop actions:
 *
 *   TaskTemplateBuilder (state + derivations + onChange mutations)
 *   ├─ TaskTemplateSettingsCard  template identity/workflow/client settings
 *   ├─ ClientMechanicsMatrix ... loop-mechanic assignment presentation
 *   ├─ useModerationLoopActions  moderation-loop mutation controller
 *   ├─ ModerationLoopsList ..... per-loop editor composition
 *   ├─ SharedFieldInserter ...... shared-field empty-state / picker + preview
 *   ├─ StandardTemplateFields .. flat DnD field list
 *   └─ Builder* chrome ......... validation, actions, and deferred preview
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
  const [mechanicMatrixSearch, setMechanicMatrixSearch] = useState('');
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

  const visibleMatrixMechanics = useMemo(() => {
    const query = mechanicMatrixSearch.trim().toLowerCase();
    if (!query)
      return activeMechanics;
    return activeMechanics.filter(
      (m) => m.title.toLowerCase().includes(query) || m.instruction_label.toLowerCase().includes(query),
    );
  }, [activeMechanics, mechanicMatrixSearch]);

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
    onChange(upgradeAllMechanicReferences(template, clientMechanics));
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

  const handleToggleMechanic = useCallback((
    mechanic: ClientMechanic,
    loopId: string,
    checked: boolean,
  ) => {
    const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
    currentOnChange(checked
      ? assignMechanicToLoop(currentTemplate, mechanic, loopId)
      : removeMechanicFromLoop(currentTemplate, mechanic.id, loopId));
    const loopName = moderationLoops.find((loop) => loop.id === loopId)?.name ?? 'loop';
    toast.success(
      `${checked ? 'Assigned' : 'Removed'} mechanic "${mechanic.title}" ${checked ? 'to' : 'from'} ${loopName}`,
    );
  }, [moderationLoops]);

  const handleUpgradeMechanic = useCallback((mechanic: ClientMechanic, loopId: string) => {
    const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
    currentOnChange({
      ...currentTemplate,
      items: currentTemplate.items.map((item) => (
        item.group === loopId && item.mechanic_ref?.mechanic_id === mechanic.id
          ? { ...item, ...buildMechanicUpgradePatch(item, mechanic) }
          : item
      )),
    });
    const loopName = moderationLoops.find((loop) => loop.id === loopId)?.name ?? 'loop';
    toast.success(`Upgraded mechanic "${mechanic.title}" reference in ${loopName}`);
  }, [moderationLoops]);

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

  const moderationLoopActions = useModerationLoopActions({
    propsRef,
    loops: moderationLoops,
    setCollapsedLoops,
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:h-full lg:min-h-0">
      {/* Editor Column */}
      <div className="flex min-h-0 flex-col space-y-6">
        <BuilderValidationErrors errors={errors} />

        <TaskTemplateSettingsCard
          template={template}
          errors={errors}
          isOpen={isHeaderOpen}
          localName={localName}
          localDescription={localDescription}
          isModerationMode={isModerationMode}
          clientOptions={clientOptions}
          isClientsLoading={isClientsLoading}
          onOpenChange={setIsHeaderOpen}
          onNameChange={(value) => {
            setLocalName(value);
            startTransition(() => {
              const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
              currentOnChange({ ...currentTemplate, name: value });
            });
          }}
          onDescriptionChange={(value) => {
            setLocalDescription(value);
            startTransition(() => {
              const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
              currentOnChange({ ...currentTemplate, description: value });
            });
          }}
          onTaskTypeChange={(value) => {
            startTransition(() => {
              const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
              currentOnChange({ ...currentTemplate, task_type: value });
            });
          }}
          onWorkflowModeChange={handleWorkflowModeChange}
          onClientChange={(value) => {
            startTransition(() => {
              const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
              currentOnChange({ ...currentTemplate, client_id: value || null });
            });
          }}
          onClientSearch={setClientSearch}
        />
        <TaskTemplateFieldsToolbar
          isModerationMode={isModerationMode}
          itemCount={template.items.length}
          loopCount={moderationLoops.length}
          formattedDuration={formatTotalLoopDuration(totalLoopDurationMin)}
          onAdd={() => {
            if (!isModerationMode) {
              addField();
              return;
            }
            const nextLoops = [...moderationLoops, createNextLoop(moderationLoops)];
            const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
            currentOnChange({
              ...currentTemplate,
              metadata: { ...(currentTemplate.metadata ?? {}), loops: nextLoops },
            });
            setPendingFocusLoopId(nextLoops[nextLoops.length - 1].id);
          }}
        />

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
                  <ClientMechanicsMatrix
                    clientId={template.client_id}
                    templateItems={template.items}
                    clientMechanics={clientMechanics}
                    activeMechanics={activeMechanics}
                    visibleMechanics={visibleMatrixMechanics}
                    loops={moderationLoops}
                    isLoading={isClientMechanicsLoading}
                    isMobile={isMobile}
                    hasRetiredRefs={hasRetiredRefs}
                    hasSupersededRefs={hasSupersededRefs}
                    search={mechanicMatrixSearch}
                    onSearchChange={setMechanicMatrixSearch}
                    onUpgradeAll={handleUpgradeAllMechanics}
                    onToggle={handleToggleMechanic}
                    onUpgrade={handleUpgradeMechanic}
                  />
                  <ModerationLoopsList
                    loops={moderationLoops}
                    itemsByLoopId={loopItemsById}
                    collapsedLoops={collapsedLoops}
                    templateItems={template.items}
                    errors={errors}
                    sensors={sensors}
                    cardRefs={loopCardRefs}
                    clientMechanics={clientMechanics}
                    actions={moderationLoopActions}
                    onDragEnd={handleDragEnd}
                    onUpdateField={updateField}
                    onRemoveField={removeField}
                  />
                </div>
              )
            : (
                <StandardTemplateFields
                  items={template.items}
                  errors={errors}
                  sensors={sensors}
                  scrollToItemId={pendingScrollFieldId}
                  clientMechanics={clientMechanics}
                  onDragEnd={handleDragEnd}
                  onUpdate={updateField}
                  onRemove={removeField}
                  onScrolledToItem={() => setPendingScrollFieldId(null)}
                />
              )}
        </div>
        <BuilderActions
          template={template}
          isSaving={isSaving}
          showCancelAlert={showCancelAlert}
          onCancelAlertChange={setShowCancelAlert}
          onSave={onSave}
          onCancel={onCancel}
        />
      </div>
      <BuilderLivePreview template={deferredTemplate} />
    </div>
  );
}
