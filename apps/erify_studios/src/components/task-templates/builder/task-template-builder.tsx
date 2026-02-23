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
import { AlertCircle, ChevronsUpDown, Plus } from 'lucide-react';
import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
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
  Textarea,
} from '@eridu/ui';

import { LivePreview } from './live-preview';
import type { FieldItem, TemplateSchemaType } from './schema';
import { SortableFieldList } from './sortable-field-list';

export type TaskTemplateBuilderProps = {
  template: TemplateSchemaType;
  onChange: (template: TemplateSchemaType) => void;
  onSave?: (data: TemplateSchemaType) => void;
  onCancel?: () => void;
  isSaving?: boolean;
  errors?: Record<string, string[]>;
};

export function TaskTemplateBuilder({
  template,
  onChange,
  onSave,
  onCancel,
  isSaving,
  errors,
}: TaskTemplateBuilderProps) {
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);

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

  // Defer the template for heavy rendering (preview)
  const deferredTemplate = useDeferredValue(template);

  // Keep latest props in a ref to avoid re-creating callbacks
  const propsRef = useRef({ template, onChange });
  useEffect(() => {
    propsRef.current = { template, onChange };
  }, [template, onChange]);

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
    const newField: FieldItem = {
      id: crypto.randomUUID(),
      key: `field_${Date.now()}`,
      type: 'text',
      label: 'New Question',
      required: true,
    };

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-13rem)]">
      {/* Editor Column */}
      <div className="flex flex-col space-y-6 overflow-hidden">
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
                      messages.map((msg, i) => (
                        <li key={`${path}-${msg}-${i}`}>
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
                    <SelectItem value="SETUP">Setup</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="CLOSURE">Closure</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="ROUTINE">Routine</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            Fields (
            {template.items.length}
            )
          </h3>
          <Button onClick={addField} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {' '}
            Add Field
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={template.items} strategy={verticalListSortingStrategy}>
              <SortableFieldList
                items={template.items}
                onUpdate={updateField}
                onRemove={removeField}
                errors={errors}
              />
            </SortableContext>
          </DndContext>

          {!template.items.length && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
              <p>No fields yet. Click "Add Field" to start building your template.</p>
            </div>
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
      <div className="hidden lg:flex flex-col bg-muted/30 rounded-lg border overflow-hidden">
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
