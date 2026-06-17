import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, ChevronDown, ChevronUp, GripVertical, RefreshCw, Trash2 } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';

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
import { isMechanicField, isSharedField } from './schema';

import type { ClientMechanic } from '@/features/client-mechanics/api/get-client-mechanics';

type SortableFieldItemProps = {
  index?: number;
  item: FieldItem;
  onUpdate: (id: string, updates: Partial<FieldItem>) => void;
  onRemove: (id: string) => void;
  errors?: Record<string, string[]>;
  clientMechanics?: ClientMechanic[];
};

export const SortableFieldItem = memo(({ index, item, onUpdate, onRemove, errors, clientMechanics }: SortableFieldItemProps) => {
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

  const mechanicRef = (item as any).mechanic_ref;
  const mechanic = clientMechanics?.find((m) => m.id === mechanicRef?.mechanic_id);
  const isRetired = mechanic ? mechanic.status === 'retired' : false;
  const isSuperseded = mechanic ? mechanic.content_revision > mechanicRef?.content_revision : false;

  return (
    <div
      ref={setNodeRef}
      data-field-id={item.id}
      style={style}
      className="relative group"
    >
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
                  {isSharedField(item) && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                      Shared
                    </Badge>
                  )}
                  {isMechanicField(item) && (
                    <Badge variant="default" className="text-[10px] h-5 px-1.5 bg-blue-600 hover:bg-blue-700 text-white border-none">
                      Mechanic
                    </Badge>
                  )}
                  {isRetired && (
                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5 bg-amber-500 hover:bg-amber-600 text-white border-none">
                      Retired Mechanic
                    </Badge>
                  )}
                  {isSuperseded && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-yellow-50 border-yellow-300 text-yellow-800 flex items-center gap-0.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {' '}
                      Catalog Update Available
                    </Badge>
                  )}
                  <span className={`font-mono text-[10px] ${errors?.key ? 'text-destructive font-bold' : ''}`}>{item.key}</span>
                  {item.required && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 text-zinc-400">
                      Required
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                {isSuperseded && mechanic && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs text-yellow-600 border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700 flex items-center gap-1 shrink-0"
                    title="Upgrade to latest catalog revision"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(item.id, {
                        label: mechanic.instruction_label,
                        description: mechanic.instruction_body,
                        mechanic_ref: {
                          ...mechanicRef,
                          content_revision: mechanic.content_revision,
                        },
                      });
                      toast.success('Field upgraded to latest mechanic catalog version');
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {' '}
                    Upgrade
                  </Button>
                )}
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
              {(isRetired || isSuperseded) && mechanic && (
                <div className="mb-4 p-3 border rounded-md bg-amber-50/50 border-amber-200 text-xs text-amber-800 space-y-2 mt-4">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {isRetired ? 'This mechanic has been retired from the catalog' : 'This mechanic has been updated in the catalog'}
                  </div>
                  <div>
                    {isRetired
                      ? 'Operator assignments can keep using this template, but you should transition to an active mechanic if possible.'
                      : `The catalog has a newer revision (v${mechanic.content_revision}) than the one currently used (v${mechanicRef.content_revision}).`}
                  </div>
                  {isSuperseded && (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 h-7 text-[11px]"
                      onClick={() => {
                        onUpdate(item.id, {
                          label: mechanic.instruction_label,
                          description: mechanic.instruction_body,
                          mechanic_ref: {
                            ...mechanicRef,
                            content_revision: mechanic.content_revision,
                          },
                        });
                        toast.success('Field upgraded to latest mechanic catalog version');
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {' '}
                      Upgrade Reference
                    </Button>
                  )}
                </div>
              )}
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
