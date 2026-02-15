import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@eridu/ui';

import { FieldEditor } from './field-editor';
import type { FieldItem } from './schema';

type SortableFieldItemProps = {
  index?: number;
  item: FieldItem;
  onUpdate: (id: string, updates: Partial<FieldItem>) => void;
  onRemove: (id: string) => void;
  errors?: Record<string, string[]>;
};

export const SortableFieldItem = memo(({ index, item, onUpdate, onRemove, errors }: SortableFieldItemProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasErrors = errors && Object.keys(errors).length > 0;

  const handleFieldUpdate = useCallback((updates: Partial<FieldItem>) => {
    onUpdate(item.id, updates);
  }, [item.id, onUpdate]);

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className={`${isDragging ? 'border-primary' : ''} ${hasErrors ? 'border-destructive ring-1 ring-destructive/20' : ''}`}>
          <CardHeader className="p-3 flex flex-row items-center space-y-0 gap-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing p-1"
            >
              <GripVertical className="h-5 w-5" />
            </div>

            <div className="flex-1 flex items-center justify-between min-w-0">
              <div className="flex flex-col truncate min-w-0 flex-1">
                <div className="flex items-start gap-2 min-w-0">
                  {index !== undefined && (
                    <span className="text-muted-foreground font-medium shrink-0 text-sm mt-0.5">
                      {index + 1}
                      .
                    </span>
                  )}
                  <span className={`font-medium truncate ${hasErrors ? 'text-destructive' : ''}`}>{item.label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase">
                    {item.type}
                  </Badge>
                  <span className={`font-mono text-[10px] ${errors?.key ? 'text-destructive font-bold' : ''}`}>{item.key}</span>
                  {item.required && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 text-zinc-400">
                      Required
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {isOpen
                      ? (
                          <ChevronUp className="h-4 w-4" />
                        )
                      : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="p-4 pt-0 border-t bg-muted/20">
              <FieldEditor
                item={item}
                onUpdate={handleFieldUpdate}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
});
SortableFieldItem.displayName = 'SortableFieldItem';
