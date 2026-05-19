import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, Copy, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { createTaskTemplateFieldId, getSchemaEngine } from '@eridu/api-types/task-management';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@eridu/ui';

import type { BuilderTemplateSchemaType, FieldItem, LoopMetadata } from './schema';
import { SortableFieldList } from './sortable-field-list';
import { createNextLoop, createTextFieldForTemplate, createUniqueCopiedKey, DEFAULT_LOOP_DURATION_MIN, omitLoopsFromMetadata } from './task-template-helpers';

export type TaskTemplateCardsViewProps = {
  template: BuilderTemplateSchemaType;
  onChange: (template: BuilderTemplateSchemaType) => void;
  errors?: Record<string, string[]>;
  isModerationMode: boolean;
  moderationLoops: LoopMetadata[];
  pendingFocusLoopId?: string | null;
  onScrolledToLoop?: () => void;
  pendingScrollFieldId?: string | null;
  onScrolledToField?: () => void;
};

export function TaskTemplateCardsView({
  template,
  onChange,
  errors,
  isModerationMode,
  moderationLoops,
  pendingFocusLoopId,
  pendingScrollFieldId,
  onScrolledToField,
}: TaskTemplateCardsViewProps) {
  const [collapsedLoops, setCollapsedLoops] = useState<Record<string, boolean>>({});

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
      onScrolledToLoop?.();
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

  if (isModerationMode) {
    return (
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
                        const engine = getSchemaEngine(currentTemplate);
                        const loopItems = currentTemplate.items.filter((item) => item.group === loop.id);

                        if (engine === 'task_template_v1' && loopItems.some((item) => 'standard' in item && item.standard)) {
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
                        const stripSourceLoopSuffix = (value: string | undefined, sourceGroup: string | undefined): string | undefined => {
                          if (!value || !sourceGroup) {
                            return value;
                          }
                          const suffix = `_${sourceGroup}`;
                          return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
                        };
                        const clonedItems = loopItems.map((item) => {
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
                          const newField = createTextFieldForTemplate(currentTemplate, loop.id);
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
                        scrollToItemId={pendingScrollFieldId}
                        onScrolledToItem={() => {
                          onScrolledToField?.();
                        }}
                      />
                    </SortableContext>
                  </DndContext>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed"
                    onClick={() => {
                      const { template: currentTemplate, onChange: currentOnChange } = propsRef.current;
                      const newField = createTextFieldForTemplate(currentTemplate, loop.id);
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
    );
  }

  return (
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
              onScrolledToField?.();
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
  );
}
