import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-react';

import { Badge, Button, Checkbox, Label } from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import type { SelectedColumnDescriptor } from './report-column-picker.types';

type SortableSelectedColumnItemProps = {
  column: SelectedColumnDescriptor;
  index: number;
  total: number;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onIncludeExtraChange: (columnKey: string, includeExtra: boolean) => void;
  onRemove: () => void;
};

/**
 * One row in the ordered "Selected Columns" list: a drag handle (dnd-kit
 * sortable), provenance/position badges, an optional "include extra input
 * column" toggle, and up/down/remove controls. Pure presentation — all
 * mutations are delegated to the picker via the `onMove`/`onIncludeExtraChange`/
 * `onRemove` callbacks.
 */
export function SortableSelectedColumnItem({
  column,
  index,
  total,
  onMove,
  onIncludeExtraChange,
  onRemove,
}: SortableSelectedColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    zIndex: isDragging ? 1 : 0,
  };
  const includeExtraId = `include-extra-${column.key.replaceAll(':', '-')}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col gap-3 rounded-md border bg-muted/20 px-3 py-3 md:flex-row md:items-center md:justify-between',
        isDragging && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-0.5 h-7 w-7 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
          aria-label={`Drag to reorder ${column.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium">{column.label}</div>
            <Badge variant="outline">{column.groupLabel}</Badge>
            <Badge variant="secondary">
              #
              {index + 1}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground break-all">{column.detail}</div>
          {column.canIncludeExtra && (
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id={includeExtraId}
                checked={column.include_extra === true}
                onCheckedChange={(checked) => onIncludeExtraChange(column.key, checked === true)}
              />
              <Label htmlFor={includeExtraId} className="text-xs font-normal text-muted-foreground">
                Include extra input column for
                {' '}
                {column.label}
              </Label>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove(index, 'up')}
          disabled={index === 0}
          aria-label={`Move ${column.label} up`}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove(index, 'down')}
          disabled={index === total - 1}
          aria-label={`Move ${column.label} down`}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onRemove}
          aria-label={`Remove ${column.label}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
