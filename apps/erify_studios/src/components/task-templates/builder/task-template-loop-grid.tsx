import { Copy, Lock, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@eridu/ui';

import { type BuilderTemplateSchemaType, type FieldItem, isSharedField } from './schema';
import { buildLoopMetadataFromTemplate, createNextLoop, createTextFieldForTemplate, createUniqueCopiedKey } from './task-template-helpers';

export type TaskTemplateLoopGridProps = {
  template: BuilderTemplateSchemaType;
  onChange: (template: BuilderTemplateSchemaType) => void;
  errors?: Record<string, string[]>;
};

const GridCell = memo(({
  field,
  loopId,
  loopIndex,
  slotIndex,
  errorMessages,
  onUpdateField,
  onPaste,
  onFillDown,
}: {
  field?: FieldItem;
  loopId: string;
  loopIndex: number;
  slotIndex: number;
  errorMessages?: string[];
  onUpdateField: (loopId: string, slotIndex: number, updates: Partial<FieldItem>) => void;
  onPaste: (e: React.ClipboardEvent, loopIndex: number, slotIndex: number) => void;
  onFillDown: (loopIndex: number, slotIndex: number) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isShared = field ? isSharedField(field as { standard?: boolean; shared_field_key?: string }) : false;
  const hasError = errorMessages && errorMessages.length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, key: 'label' | 'description') => {
    if (!field || isShared)
      return;
    onUpdateField(loopId, slotIndex, { [key]: e.target.value });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    onPaste(e, loopIndex, slotIndex);
  };

  if (!field) {
    return (
      <div
        className="flex h-full min-h-[60px] items-center justify-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/10 p-2 hover:bg-muted/30 cursor-pointer text-muted-foreground"
        onClick={() => onUpdateField(loopId, slotIndex, { label: 'New Checkbox' })}
      >
        <Plus className="mr-1 h-3 w-3" />
        <span className="text-xs">Add</span>
      </div>
    );
  }

  const content = (
    <div className={`relative flex flex-col rounded-md border bg-background p-2 transition-colors ${hasError ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
      <div className="flex items-start gap-1">
        <Input
          value={field.label || ''}
          onChange={(e) => handleChange(e, 'label')}
          onPaste={handlePaste}
          disabled={isShared}
          placeholder="Label"
          className="h-8 flex-1 px-2 py-1 text-sm bg-transparent border-none shadow-none focus-visible:ring-1"
        />
        <div className="flex shrink-0 items-center">
          {isShared && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="h-3 w-3 text-muted-foreground mx-1" />
                </TooltipTrigger>
                <TooltipContent>Shared field. Edit in Shared Fields settings.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? 'Hide description' : 'Add description'}
              </DropdownMenuItem>
              {!isShared && (
                <DropdownMenuItem onClick={() => onFillDown(loopIndex, slotIndex)}>
                  Fill column down
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {(isExpanded || field.description) && (
        <div className="mt-1">
          <Textarea
            value={field.description || ''}
            onChange={(e) => handleChange(e, 'description')}
            onPaste={handlePaste}
            disabled={isShared}
            placeholder="Description (optional)"
            className="min-h-[60px] resize-none text-xs bg-muted/30 border-muted-foreground/20"
          />
        </div>
      )}
    </div>
  );

  if (hasError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent className="bg-destructive text-destructive-foreground">
            <ul className="list-disc pl-4 text-xs">
              {errorMessages.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
});

GridCell.displayName = 'GridCell';

export function TaskTemplateLoopGrid({ template, onChange, errors }: TaskTemplateLoopGridProps) {
  const loops = useMemo(() => buildLoopMetadataFromTemplate(template), [template]);

  const groupedFields = useMemo(() => {
    const map = new Map<string, FieldItem[]>();
    template.items.forEach((item) => {
      const g = item.group || '';
      if (!map.has(g))
        map.set(g, []);
      map.get(g)!.push(item);
    });
    return map;
  }, [template.items]);

  const loopCheckboxes = useMemo(() => {
    return loops.map((loop) => {
      const fields = groupedFields.get(loop.id) || [];
      return fields.filter((f) => f.type === 'checkbox');
    });
  }, [loops, groupedFields]);

  const loopNonCheckboxes = useMemo(() => {
    return loops.map((loop) => {
      const fields = groupedFields.get(loop.id) || [];
      return fields.filter((f) => f.type !== 'checkbox');
    });
  }, [loops, groupedFields]);

  const maxSlots = useMemo(() => {
    return Math.max(1, ...loopCheckboxes.map((cb) => cb.length));
  }, [loopCheckboxes]);

  const getErrorMessages = useCallback((fieldId: string) => {
    if (!errors)
      return undefined;
    const itemIndex = template.items.findIndex((item) => item.id === fieldId);
    if (itemIndex === -1)
      return undefined;

    // Check for `items.${index}.something` in errors object
    const prefix = `items.${itemIndex}`;
    const msgs: string[] = [];
    Object.entries(errors).forEach(([path, currentErrors]) => {
      if (path.startsWith(prefix)) {
        msgs.push(...currentErrors);
      }
    });
    return msgs.length > 0 ? msgs : undefined;
  }, [errors, template.items]);

  const updateField = useCallback((loopId: string, slotIndex: number, updates: Partial<FieldItem>) => {
    const loopFields = groupedFields.get(loopId) || [];
    const checkboxes = loopFields.filter((f) => f.type === 'checkbox');

    let newItems = [...template.items];

    if (slotIndex < checkboxes.length) {
      // Update existing
      const targetId = checkboxes[slotIndex].id;
      newItems = newItems.map((item) => item.id === targetId ? { ...item, ...updates } : item);
    } else {
      // Add new
      const newField = createTextFieldForTemplate(template, loopId);
      newField.type = 'checkbox';
      // Append to the end of this loop's fields
      const lastIndexInLoop = newItems.findLastIndex((item) => item.group === loopId);
      const insertAt = lastIndexInLoop === -1 ? newItems.length : lastIndexInLoop + 1;

      const mergedField = { ...newField, ...updates };
      newItems.splice(insertAt, 0, mergedField);
    }

    onChange({ ...template, items: newItems });
  }, [template, groupedFields, onChange]);

  const handleFillDown = useCallback((startLoopIndex: number, slotIndex: number) => {
    const sourceLoop = loops[startLoopIndex];
    if (!sourceLoop)
      return;
    const sourceCheckbox = loopCheckboxes[startLoopIndex]?.[slotIndex];
    if (!sourceCheckbox)
      return;

    let newItems = [...template.items];

    for (let i = startLoopIndex + 1; i < loops.length; i++) {
      const loopId = loops[i].id;
      const targetCheckboxes = loopCheckboxes[i] || [];

      if (slotIndex < targetCheckboxes.length) {
        const target = targetCheckboxes[slotIndex];
        if (isSharedField(target as { standard?: boolean; shared_field_key?: string }))
          continue;
        newItems = newItems.map((item) => item.id === target.id ? { ...item, label: sourceCheckbox.label } : item);
      } else {
        // Must create
        const newField = createTextFieldForTemplate(template, loopId);
        newField.type = 'checkbox';
        newField.label = sourceCheckbox.label;
        const lastIndexInLoop = newItems.findLastIndex((item) => item.group === loopId);
        const insertAt = lastIndexInLoop === -1 ? newItems.length : lastIndexInLoop + 1;
        newItems.splice(insertAt, 0, newField);
      }
    }
    onChange({ ...template, items: newItems });
    toast.success(`Filled column down starting from Loop ${startLoopIndex + 1}`);
  }, [template, loops, loopCheckboxes, onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent, startLoopIndex: number, startSlotIndex: number) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n'))
      return;

    e.preventDefault();
    const parsedRows = text.split(/\r?\n/).map((row) => row.split('\t'));
    if (parsedRows.length === 1 && parsedRows[0].length === 1)
      return;

    let newItems = [...template.items];
    const newLoops = [...loops];
    let rejectedSharedCount = 0;
    let pastedCount = 0;

    for (let r = 0; r < parsedRows.length; r++) {
      const rowData = parsedRows[r];
      if (rowData.length === 1 && !rowData[0].trim())
        continue; // skip empty lines

      const currentLoopIndex = startLoopIndex + r;
      let loopId: string;

      if (currentLoopIndex < newLoops.length) {
        loopId = newLoops[currentLoopIndex].id;
      } else {
        const next = createNextLoop(newLoops);
        newLoops.push(next);
        loopId = next.id;
      }

      // Group fields for this loop dynamically as we mutate
      const loopFields = newItems.filter((item) => item.group === loopId);
      const checkboxes = loopFields.filter((f) => f.type === 'checkbox');

      for (let c = 0; c < rowData.length; c++) {
        const currentSlotIndex = startSlotIndex + c;
        const val = rowData[c].trim();
        if (!val)
          continue;

        if (currentSlotIndex < checkboxes.length) {
          const target = checkboxes[currentSlotIndex];
          if (isSharedField(target as { standard?: boolean; shared_field_key?: string })) {
            rejectedSharedCount++;
            continue;
          }
          newItems = newItems.map((item) => item.id === target.id ? { ...item, label: val } : item);
          pastedCount++;
        } else {
          const newField = createTextFieldForTemplate(template, loopId);
          newField.type = 'checkbox';
          newField.label = val;
          const lastIndexInLoop = newItems.findLastIndex((item) => item.group === loopId);
          const insertAt = lastIndexInLoop === -1 ? newItems.length : lastIndexInLoop + 1;
          newItems.splice(insertAt, 0, newField);
          // Re-evaluate checkboxes for this loop for the next column in this row
          checkboxes.push(newField);
          pastedCount++;
        }
      }
    }

    const nextTemplate = { ...template, items: newItems };
    if (newLoops.length > loops.length) {
      nextTemplate.metadata = { ...(template.metadata || {}), loops: newLoops };
    }
    onChange(nextTemplate);

    if (rejectedSharedCount > 0) {
      toast.warning(`Pasted ${pastedCount} cells, skipped ${rejectedSharedCount} shared fields. Shared field labels are managed in Shared Fields settings.`);
    } else {
      toast.success(`Pasted ${pastedCount} cells across ${parsedRows.length} loops.`);
    }
  }, [template, loops, onChange]);

  const updateLoopName = useCallback((loopId: string, name: string) => {
    const newLoops = loops.map((l) => l.id === loopId ? { ...l, name } : l);
    onChange({ ...template, metadata: { ...template.metadata, loops: newLoops } });
  }, [loops, onChange, template]);

  const removeLoop = useCallback((loopIndex: number) => {
    const loopId = loops[loopIndex].id;
    const newLoops = loops.filter((_, i) => i !== loopIndex);
    const newItems = template.items.filter((item) => item.group !== loopId);
    onChange({ ...template, items: newItems, metadata: { ...template.metadata, loops: newLoops } });
  }, [loops, onChange, template]);

  const cloneLoop = useCallback((loopIndex: number) => {
    const loopToClone = loops[loopIndex];
    const newLoop = createNextLoop(loops);
    const newLoops = [...loops];
    newLoops.splice(loopIndex + 1, 0, newLoop);

    const usedKeys = new Set(template.items.map((item) => item.key));
    const itemsToClone = template.items.filter((item) => item.group === loopToClone.id);
    const clonedItems = itemsToClone.map((item) => {
      const newField = createTextFieldForTemplate(template, newLoop.id);
      return {
        ...item,
        id: newField.id,
        group: newLoop.id,
        key: createUniqueCopiedKey(item.key, usedKeys),
      };
    });

    const lastIndex = template.items.findLastIndex((item) => item.group === loopToClone.id);
    const insertAt = lastIndex === -1 ? template.items.length : lastIndex + 1;
    const newItems = [...template.items];
    newItems.splice(insertAt, 0, ...clonedItems);

    onChange({ ...template, items: newItems, metadata: { ...template.metadata, loops: newLoops } });
  }, [loops, onChange, template]);

  const addLoop = useCallback(() => {
    const newLoop = createNextLoop(loops);
    onChange({ ...template, metadata: { ...template.metadata, loops: [...loops, newLoop] } });
  }, [loops, onChange, template]);

  const addSlotColumn = useCallback(() => {
    const newItems = [...template.items];
    loops.forEach((loop) => {
      const newField = createTextFieldForTemplate(template, loop.id);
      newField.type = 'checkbox';
      const lastIndexInLoop = newItems.findLastIndex((item) => item.group === loop.id);
      const insertAt = lastIndexInLoop === -1 ? newItems.length : lastIndexInLoop + 1;
      newItems.splice(insertAt, 0, newField);
    });
    onChange({ ...template, items: newItems });
  }, [loops, onChange, template]);

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse min-w-max">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="font-semibold p-3 border-r w-[200px] shrink-0 sticky left-0 z-10 bg-muted/50 backdrop-blur-sm">Loop</th>
            {Array.from({ length: maxSlots }).map((_, i) => (
              <th key={`header_slot_${i}`} className="font-semibold p-3 border-r w-[250px]">
                Slot
                {' '}
                {i + 1}
              </th>
            ))}
            <th className="p-3 w-[60px]">
              <Button variant="ghost" size="icon" onClick={addSlotColumn} className="h-6 w-6" aria-label="Add slot column">
                <Plus className="h-4 w-4" />
              </Button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {loops.map((loop, rowIndex) => {
            const rowCheckboxes = loopCheckboxes[rowIndex] || [];
            const rowNonCheckboxes = loopNonCheckboxes[rowIndex] || [];

            return (
              <React.Fragment key={loop.id}>
                <tr>
                  <td className="p-3 border-r align-top sticky left-0 z-10 bg-card">
                    <div className="flex flex-col gap-2">
                      <Input
                        value={loop.name}
                        onChange={(e) => updateLoopName(loop.id, e.target.value)}
                        className="h-8 font-medium bg-transparent shadow-none"
                      />
                      <div className="flex gap-1 pl-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => cloneLoop(rowIndex)} title="Clone loop">
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeLoop(rowIndex)} title="Delete loop">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </td>
                  {Array.from({ length: maxSlots }).map((_, colIndex) => {
                    const field = rowCheckboxes[colIndex];
                    return (
                      <td key={`cell_${loop.id}_${colIndex}`} className="p-2 border-r align-top min-w-[200px]">
                        <GridCell
                          field={field}
                          loopId={loop.id}
                          loopIndex={rowIndex}
                          slotIndex={colIndex}
                          errorMessages={field ? getErrorMessages(field.id) : undefined}
                          onUpdateField={updateField}
                          onPaste={handlePaste}
                          onFillDown={handleFillDown}
                        />
                      </td>
                    );
                  })}
                  <td className="p-2" />
                </tr>
                {rowNonCheckboxes.length > 0 && (
                  <tr className="bg-muted/10">
                    <td colSpan={maxSlots + 2} className="px-4 py-2 border-t border-dashed">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">Non-checkbox fields in this loop:</span>
                        <div className="flex flex-wrap gap-2 flex-1">
                          {rowNonCheckboxes.map((f) => (
                            <span key={f.id} className="inline-flex items-center rounded-sm bg-background px-2 py-0.5 border">
                              {f.label || 'Untitled'}
                              {' '}
                              (
                              {f.type}
                              )
                            </span>
                          ))}
                        </div>
                        <span className="text-muted-foreground/60 italic shrink-0 hidden sm:inline">
                          Switch to Cards view to edit field structure
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          <tr>
            <td colSpan={maxSlots + 2} className="p-3">
              <Button variant="ghost" size="sm" onClick={addLoop} className="text-muted-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Add Loop
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default TaskTemplateLoopGrid;
