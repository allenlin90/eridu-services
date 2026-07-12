import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { ComponentProps } from 'react';

import { Button } from '@eridu/ui';

import type { FieldItem } from './schema';
import { SortableFieldList } from './sortable-field-list';

import type { ClientMechanic } from '@/features/client-mechanics/api/get-client-mechanics';

export function TaskTemplateFieldsToolbar(props: {
  isModerationMode: boolean;
  itemCount: number;
  loopCount: number;
  formattedDuration: string;
  onAdd: () => void;
}) {
  const { isModerationMode, itemCount, loopCount, formattedDuration, onAdd } = props;
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-medium">
          {isModerationMode ? 'Loops Configuration' : `Fields (${itemCount})`}
        </h3>
        {isModerationMode && loopCount > 0
          ? (
              <p className="text-xs text-muted-foreground mt-1">
                Total duration:
                {formattedDuration}
              </p>
            )
          : null}
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        {' '}
        {isModerationMode ? 'Add Loop' : 'Add Field'}
      </Button>
    </div>
  );
}

export function StandardTemplateFields(props: {
  items: FieldItem[];
  errors?: Record<string, string[]>;
  sensors: ComponentProps<typeof DndContext>['sensors'];
  scrollToItemId: string | null;
  clientMechanics: ClientMechanic[];
  onDragEnd: (event: DragEndEvent) => void;
  onUpdate: (id: string, updates: Partial<FieldItem>) => void;
  onRemove: (id: string) => void;
  onScrolledToItem: () => void;
}) {
  const {
    items,
    errors,
    sensors,
    scrollToItemId,
    clientMechanics,
    onDragEnd,
    onUpdate,
    onRemove,
    onScrolledToItem,
  } = props;
  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <SortableFieldList
            items={items}
            templateItems={items}
            onUpdate={onUpdate}
            onRemove={onRemove}
            errors={errors}
            scrollToItemId={scrollToItemId}
            onScrolledToItem={onScrolledToItem}
            clientMechanics={clientMechanics}
          />
        </SortableContext>
      </DndContext>
      {items.length === 0
        ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
              <p>No fields yet. Click "Add Field" to start building your template.</p>
            </div>
          )
        : null}
    </>
  );
}
