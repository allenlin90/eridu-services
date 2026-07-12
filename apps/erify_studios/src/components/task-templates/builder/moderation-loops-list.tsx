import type { DragEndEvent } from '@dnd-kit/core';
import type { ComponentProps, RefObject } from 'react';

import { ModerationLoopCard } from './moderation-loop-card';
import type { BuilderTemplateSchemaType, FieldItem, LoopMetadata } from './schema';
import type { ModerationLoopActions } from './use-moderation-loop-actions';

import type { ClientMechanic } from '@/features/client-mechanics/api/get-client-mechanics';

type ModerationLoopsListProps = {
  loops: LoopMetadata[];
  itemsByLoopId: Record<string, FieldItem[]>;
  collapsedLoops: Record<string, boolean>;
  templateItems: BuilderTemplateSchemaType['items'];
  errors?: Record<string, string[]>;
  sensors: ComponentProps<typeof ModerationLoopCard>['sensors'];
  cardRefs: RefObject<Record<string, HTMLDivElement | null>>;
  clientMechanics: ClientMechanic[];
  actions: ModerationLoopActions;
  onDragEnd: (event: DragEndEvent) => void;
  onUpdateField: (id: string, updates: Partial<FieldItem>) => void;
  onRemoveField: (id: string) => void;
};

/** Renders moderation loop cards; all stateful mutations stay in the controller hook. */
export function ModerationLoopsList({
  loops,
  itemsByLoopId,
  collapsedLoops,
  templateItems,
  errors,
  sensors,
  cardRefs,
  clientMechanics,
  actions,
  onDragEnd,
  onUpdateField,
  onRemoveField,
}: ModerationLoopsListProps) {
  if (loops.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
        <p>No loops yet. Click "Add Loop" to start building.</p>
      </div>
    );
  }
  return loops.map((loop, loopIndex) => (
    <ModerationLoopCard
      key={loop.id}
      loop={loop}
      loopIndex={loopIndex}
      loopItems={itemsByLoopId[loop.id] ?? []}
      loopCount={loops.length}
      isCollapsed={collapsedLoops[loop.id] ?? false}
      templateItems={templateItems}
      errors={errors}
      sensors={sensors}
      setCardRef={(node) => {
        cardRefs.current[loop.id] = node;
      }}
      onToggleCollapse={() => actions.toggleCollapse(loop.id)}
      onClone={() => actions.cloneLoop(loop)}
      onRemove={() => actions.removeLoop(loop, loopIndex)}
      onRenameLoop={(name) => actions.renameLoop(loopIndex, name)}
      onDurationChange={(value) => actions.changeDuration(loopIndex, value)}
      onReorder={(value) => actions.reorderLoop(loopIndex, value)}
      onAddField={() => actions.addField(loop.id)}
      onDragEnd={onDragEnd}
      onUpdateField={onUpdateField}
      onRemoveField={onRemoveField}
      clientMechanics={clientMechanics}
    />
  ));
}
