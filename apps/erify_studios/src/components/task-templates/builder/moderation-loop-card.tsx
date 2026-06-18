import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, Copy, Plus, Trash2 } from 'lucide-react';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import type { FieldItem, LoopMetadata } from './schema';
import { SortableFieldList } from './sortable-field-list';

/**
 * One moderation loop card: header controls (collapse / clone / remove), the
 * loop's name / duration / position editors, and — when expanded — the loop's
 * sortable field list with add-field affordances. Pure presentation: the card
 * holds no state and forwards every mutation to the builder through the
 * `on*` callbacks (each already scoped to this loop by the parent). Raw input
 * strings are passed up unparsed so the loop business rules stay in the builder.
 */
export function ModerationLoopCard({
  loop,
  loopIndex,
  loopItems,
  loopCount,
  isCollapsed,
  templateItems,
  errors,
  sensors,
  setCardRef,
  onToggleCollapse,
  onClone,
  onRemove,
  onRenameLoop,
  onDurationChange,
  onReorder,
  onAddField,
  onDragEnd,
  onUpdateField,
  onRemoveField,
}: {
  loop: LoopMetadata;
  loopIndex: number;
  loopItems: FieldItem[];
  loopCount: number;
  isCollapsed: boolean;
  templateItems: FieldItem[];
  errors?: Record<string, string[]>;
  sensors: SensorDescriptor<SensorOptions>[];
  setCardRef: (node: HTMLDivElement | null) => void;
  onToggleCollapse: () => void;
  onClone: () => void;
  onRemove: () => void;
  onRenameLoop: (name: string) => void;
  onDurationChange: (rawValue: string) => void;
  onReorder: (rawValue: string) => void;
  onAddField: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onUpdateField: (id: string, updates: Partial<FieldItem>) => void;
  onRemoveField: (id: string) => void;
}) {
  return (
    <div
      ref={setCardRef}
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
              onClick={onToggleCollapse}
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
              onClick={onClone}
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
              onClick={onRemove}
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
              onChange={(e) => onRenameLoop(e.target.value)}
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
                onChange={(e) => onDurationChange(e.target.value)}
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
              onValueChange={onReorder}
            >
              <SelectTrigger aria-label="Loop position">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: loopCount }, (_, index) => (
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
                onClick={onAddField}
              >
                Add First Field
              </Button>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={loopItems} strategy={verticalListSortingStrategy}>
              <SortableFieldList
                items={loopItems}
                templateItems={templateItems}
                onUpdate={onUpdateField}
                onRemove={onRemoveField}
                errors={errors}
              />
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed"
            onClick={onAddField}
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
}
