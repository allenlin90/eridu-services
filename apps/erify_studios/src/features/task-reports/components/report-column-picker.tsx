import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripVertical, Loader2, Search, X } from 'lucide-react';
import * as React from 'react';

import type {
  TaskReportScope,
  TaskReportSelectedColumn,
} from '@eridu/api-types/task-management';
import { TASK_REPORT_SYSTEM_COLUMN } from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import { useTaskReportSources } from '../hooks/use-task-report-sources';

type ReportColumnPickerProps = {
  studioId: string;
  scope: TaskReportScope | null;
  selectedColumns: TaskReportSelectedColumn[];
  onChange: (columns: TaskReportSelectedColumn[]) => void;
};

type SelectedColumnDescriptor = TaskReportSelectedColumn & {
  groupLabel: string;
  detail: string;
};

const MAX_COLUMNS = 50;
const SOFT_WARNING_THRESHOLD = 30;
const LARGE_SCOPE_TEMPLATE_THRESHOLD = 10;
const DEFAULT_EXPANDED_TEMPLATE_COUNT = 3;

const SYSTEM_COLUMNS = [
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_ID, label: 'Show ID' },
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_NAME, label: 'Show Name' },
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_EXTERNAL_ID, label: 'Show External ID' },
  { key: TASK_REPORT_SYSTEM_COLUMN.CLIENT_NAME, label: 'Client Name' },
  { key: TASK_REPORT_SYSTEM_COLUMN.START_TIME, label: 'Start Time' },
  { key: TASK_REPORT_SYSTEM_COLUMN.END_TIME, label: 'End Time' },
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_STANDARD_NAME, label: 'Show Standard' },
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_TYPE_NAME, label: 'Show Type' },
  { key: TASK_REPORT_SYSTEM_COLUMN.STUDIO_ROOM_NAME, label: 'Room' },
];

const SHARED_FIELD_CATEGORY_LABELS = {
  metric: 'Metrics',
  evidence: 'Evidence',
  status: 'Status',
} as const;

function normalized(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function extractTemplateIdFromColumnKey(columnKey: string): string | null {
  const splitIndex = columnKey.indexOf(':');
  if (splitIndex <= 0) {
    return null;
  }
  return columnKey.slice(0, splitIndex);
}

export function ReportColumnPicker({
  studioId,
  scope,
  selectedColumns,
  onChange,
}: ReportColumnPickerProps) {
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const { data: sourcesData, isLoading, isError } = useTaskReportSources(studioId, scope);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSelectedOnly, setShowSelectedOnly] = React.useState(false);
  const [showTemplatesWithSelectedColumnsOnly, setShowTemplatesWithSelectedColumnsOnly] = React.useState(false);
  const [expandedTemplateById, setExpandedTemplateById] = React.useState<Record<string, boolean>>({});
  const sources = React.useMemo(() => sourcesData?.sources ?? [], [sourcesData?.sources]);
  const sharedFields = React.useMemo(() => sourcesData?.shared_fields ?? [], [sourcesData?.shared_fields]);
  const systemColumnMap = React.useMemo(() => new Map(SYSTEM_COLUMNS.map((column) => [column.key, column])), []);
  const sharedFieldByKey = React.useMemo(() => new Map(sharedFields.map((f) => [f.key, f])), [sharedFields]);

  const selectedColumnKeys = React.useMemo(() => {
    return new Set(selectedColumns.map((column) => column.key));
  }, [selectedColumns]);
  const selectedTemplateIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const column of selectedColumns) {
      const templateId = extractTemplateIdFromColumnKey(column.key);
      if (templateId) {
        ids.add(templateId);
      }
    }
    return ids;
  }, [selectedColumns]);

  const isSelected = React.useCallback((fieldKey: string) => {
    return selectedColumnKeys.has(fieldKey);
  }, [selectedColumnKeys]);
  const isAtLimit = selectedColumns.length >= MAX_COLUMNS;

  const moveSelectedColumn = React.useCallback((index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedColumns.length) {
      return;
    }

    const next = [...selectedColumns];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  }, [onChange, selectedColumns]);

  const handleSelectedColumnDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = selectedColumns.findIndex((column) => column.key === active.id);
    const newIndex = selectedColumns.findIndex((column) => column.key === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    onChange(arrayMove(selectedColumns, oldIndex, newIndex));
  }, [onChange, selectedColumns]);

  const toggleColumn = React.useCallback((
    fieldKey: string,
    fieldLabel: string,
    fieldType: TaskReportSelectedColumn['type'] | undefined,
    checked: boolean,
  ) => {
    if (checked) {
      if (selectedColumnKeys.has(fieldKey) || selectedColumns.length >= MAX_COLUMNS) {
        return;
      }
      onChange([...selectedColumns, { key: fieldKey, label: fieldLabel, type: fieldType }]);
      return;
    }
    onChange(selectedColumns.filter((column) => column.key !== fieldKey));
  }, [onChange, selectedColumnKeys, selectedColumns]);

  const sortedSources = React.useMemo(() => {
    return [...sources].sort((a, b) => {
      if (b.submitted_task_count !== a.submitted_task_count) {
        return b.submitted_task_count - a.submitted_task_count;
      }
      return a.template_name.localeCompare(b.template_name);
    });
  }, [sources]);

  const templateFieldByKey = React.useMemo(() => {
    const map = new Map<string, { source: (typeof sortedSources)[number]; field: (typeof sortedSources)[number]['fields'][number] }>();
    for (const source of sortedSources) {
      for (const field of source.fields) {
        map.set(field.key, { source, field });
      }
    }
    return map;
  }, [sortedSources]);

  const selectedColumnDescriptors = React.useMemo(() => selectedColumns.map((column): SelectedColumnDescriptor => {
    const systemColumn = systemColumnMap.get(column.key);
    if (systemColumn) {
      return { ...column, groupLabel: 'System', detail: column.key };
    }

    const sharedField = sharedFieldByKey.get(column.key);
    if (sharedField) {
      return { ...column, groupLabel: 'Shared', detail: `${sharedField.type} · ${sharedField.key}` };
    }

    const templateField = templateFieldByKey.get(column.key);
    if (templateField) {
      return {
        ...column,
        groupLabel: templateField.source.template_name,
        detail: `${templateField.field.type} · ${templateField.field.field_key}`,
      };
    }

    return { ...column, groupLabel: 'Unavailable', detail: column.key };
  }), [selectedColumns, systemColumnMap, sharedFieldByKey, templateFieldByKey]);

  const templatesSignature = sortedSources.map((source) => source.template_id).join('|');
  // Reset expansion to defaults only when the template list itself changes.
  React.useEffect(() => {
    if (sortedSources.length === 0) {
      setExpandedTemplateById({});
      return;
    }

    const defaultExpandedSourceIds = (sortedSources.length > LARGE_SCOPE_TEMPLATE_THRESHOLD
      ? sortedSources.slice(0, DEFAULT_EXPANDED_TEMPLATE_COUNT)
      : sortedSources
    ).map((source) => source.template_id);

    setExpandedTemplateById(() => {
      const next: Record<string, boolean> = {};
      for (const templateId of defaultExpandedSourceIds) {
        next[templateId] = true;
      }
      return next;
    });
  }, [templatesSignature, sortedSources]);

  // Additively expand templates that have selected columns — never collapses manual choices.
  React.useEffect(() => {
    if (selectedTemplateIds.size === 0) {
      return;
    }
    setExpandedTemplateById((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const templateId of selectedTemplateIds) {
        if (!next[templateId]) {
          next[templateId] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedTemplateIds]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading available columns...
      </div>
    );
  }

  if (isError || !sourcesData) {
    return (
      <div className="flex h-32 items-center justify-center text-destructive">
        Failed to load report sources. Please adjust your scope or try again.
      </div>
    );
  }
  const search = normalized(searchQuery);

  const hasLargeTemplateScope = sortedSources.length > LARGE_SCOPE_TEMPLATE_THRESHOLD;

  const matchesSearch = (values: Array<string | undefined>) => {
    if (!search) {
      return true;
    }
    return values.some((value) => normalized(value).includes(search));
  };

  const filteredSystemColumns = SYSTEM_COLUMNS.filter((column) => {
    if (showSelectedOnly && !isSelected(column.key)) {
      return false;
    }
    return matchesSearch([column.label, column.key]);
  });

  const sharedFieldsByCategory = sharedFields.reduce<Record<string, typeof sharedFields>>((acc, field) => {
    const category = field.category || 'metric';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(field);
    return acc;
  }, {});

  const filteredSharedFieldsByCategory = Object.entries(sharedFieldsByCategory)
    .map(([category, fields]) => {
      const filteredFields = fields.filter((field) => {
        if (showSelectedOnly && !isSelected(field.key)) {
          return false;
        }
        return matchesSearch([field.label, field.key, field.type, category]);
      });
      return { category, fields: filteredFields };
    })
    .filter((group) => group.fields.length > 0);

  const templatePanels = sortedSources
    .map((source) => {
      const customFields = source.fields.filter((field) => !field.standard);
      const templateMatchesSearch = matchesSearch([source.template_name, source.template_id]);

      const visibleFields = customFields.filter((field) => {
        if (showSelectedOnly && !isSelected(field.key)) {
          return false;
        }
        if (!search) {
          return true;
        }
        if (templateMatchesSearch) {
          return true;
        }
        return matchesSearch([field.label, field.key, field.field_key, field.type]);
      });

      const selectedCustomFieldCount = customFields.filter((field) => isSelected(field.key)).length;
      const shouldRenderPanel = (
        (showTemplatesWithSelectedColumnsOnly ? selectedCustomFieldCount > 0 : true)
        && (search ? templateMatchesSearch || visibleFields.length > 0 : true)
        && (showSelectedOnly ? selectedCustomFieldCount > 0 : true)
      );

      return {
        source,
        visibleFields,
        customFieldCount: customFields.length,
        selectedCustomFieldCount,
        shouldRenderPanel,
      };
    })
    .filter((panel) => panel.shouldRenderPanel);

  const totalSubmittedTaskCount = sortedSources.reduce((total, source) => total + source.submitted_task_count, 0);
  const totalCustomFieldCount = sortedSources.reduce((total, source) => (
    total + source.fields.filter((field) => !field.standard).length
  ), 0);

  const hasAnyVisibleColumns = (
    filteredSystemColumns.length > 0
    || filteredSharedFieldsByCategory.length > 0
    || templatePanels.some((panel) => panel.visibleFields.length > 0)
  );

  const setAllTemplatePanels = (expanded: boolean) => {
    const next: Record<string, boolean> = {};
    for (const source of sortedSources) {
      next[source.template_id] = expanded;
    }
    setExpandedTemplateById(next);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border px-3 py-2">
          <div className="text-xs text-muted-foreground">Templates in scope</div>
          <div className="text-lg font-semibold">{sortedSources.length}</div>
        </div>
        <div className="rounded-md border px-3 py-2">
          <div className="text-xs text-muted-foreground">Submitted tasks in scope</div>
          <div className="text-lg font-semibold">{totalSubmittedTaskCount}</div>
        </div>
        <div className="rounded-md border px-3 py-2">
          <div className="text-xs text-muted-foreground">Custom field options</div>
          <div className="text-lg font-semibold">{totalCustomFieldCount}</div>
        </div>
        <div className="rounded-md border px-3 py-2">
          <div className="text-xs text-muted-foreground">Shared field options</div>
          <div className="text-lg font-semibold">{sharedFields.length}</div>
        </div>
      </div>

      {hasLargeTemplateScope && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Large scope detected. Template groups are collapsed by default. Use search and selected-only mode to reduce noise.
        </div>
      )}

      <div className="space-y-3 rounded-md border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by template, field label, key, or type"
            className="pl-8 pr-10"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={() => setSearchQuery('')}
              aria-label="Clear column search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={showSelectedOnly ? 'default' : 'outline'}
            onClick={() => setShowSelectedOnly((prev) => !prev)}
          >
            Selected only
          </Button>
          <Button
            type="button"
            size="sm"
            variant={showTemplatesWithSelectedColumnsOnly ? 'default' : 'outline'}
            onClick={() => setShowTemplatesWithSelectedColumnsOnly((prev) => !prev)}
          >
            Templates with selection
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAllTemplatePanels(true)}
            disabled={sortedSources.length === 0}
          >
            Expand all templates
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAllTemplatePanels(false)}
            disabled={sortedSources.length === 0}
          >
            Collapse all templates
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
        <div>
          <div className="text-sm font-medium">Selected Columns</div>
          <div className="text-xs text-muted-foreground">Column order is preserved in the results table and CSV export.</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isAtLimit ? 'destructive' : 'outline'}>
            {selectedColumns.length}
            {' '}
            / 50
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange([])}
            disabled={selectedColumns.length === 0}
          >
            Clear selection
          </Button>
        </div>
      </div>

      {selectedColumnDescriptors.length > 0 && (
        <div className="space-y-2 rounded-md border p-3">
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleSelectedColumnDragEnd}>
            <SortableContext items={selectedColumnDescriptors.map((column) => column.key)} strategy={verticalListSortingStrategy}>
              {selectedColumnDescriptors.map((column, index) => (
                <SortableSelectedColumnItem
                  key={column.key}
                  column={column}
                  index={index}
                  total={selectedColumnDescriptors.length}
                  onMove={moveSelectedColumn}
                  onRemove={() => onChange(selectedColumns.filter((item) => item.key !== column.key))}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {selectedColumns.length >= SOFT_WARNING_THRESHOLD && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Wide tables are best reviewed in the exported spreadsheet. The table preview may require horizontal scrolling.
        </div>
      )}

      {!hasAnyVisibleColumns && (
        <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          No columns match the current search/filter settings.
        </div>
      )}

      {filteredSystemColumns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-1">
            <div className="text-sm font-medium">System Fields</div>
            <Badge variant="outline">{filteredSystemColumns.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSystemColumns.map((column) => {
              const selected = isSelected(column.key);
              return (
                <div key={column.key} className="flex items-start space-x-2">
                  <Checkbox
                    id={`field-sys-${column.key}`}
                    checked={selected}
                    disabled={!selected && isAtLimit}
                    onCheckedChange={(checked) => {
                      toggleColumn(column.key, column.label, undefined, checked === true);
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={`field-sys-${column.key}`}>{column.label}</Label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filteredSharedFieldsByCategory.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-1">
            <div className="text-sm font-medium">Shared Fields</div>
            <Badge variant="outline">{filteredSharedFieldsByCategory.reduce((total, group) => total + group.fields.length, 0)}</Badge>
          </div>
          <div className="space-y-4">
            {filteredSharedFieldsByCategory.map((group) => (
              <div key={group.category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {SHARED_FIELD_CATEGORY_LABELS[group.category as keyof typeof SHARED_FIELD_CATEGORY_LABELS] ?? group.category}
                  </div>
                  <Badge variant="outline">{group.fields.length}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.fields.map((field) => {
                    const selected = isSelected(field.key);
                    return (
                      <div key={field.key} className="flex items-start space-x-2">
                        <Checkbox
                          id={`field-shared-${field.key}`}
                          checked={selected}
                          disabled={!selected && isAtLimit}
                          onCheckedChange={(checked) => {
                            toggleColumn(field.key, field.label, field.type, checked === true);
                          }}
                        />
                        <div className="grid gap-1 leading-none">
                          <Label htmlFor={`field-shared-${field.key}`}>{field.label}</Label>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {field.type}
                            {' · '}
                            {field.key}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {templatePanels.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-1">
            <div className="text-sm font-medium">Template-Specific Fields</div>
            <Badge variant="outline">{templatePanels.length}</Badge>
          </div>

          {templatePanels.map((panel) => {
            const { source, visibleFields, customFieldCount, selectedCustomFieldCount } = panel;
            const isExpanded = expandedTemplateById[source.template_id] ?? false;
            return (
              <Collapsible
                key={source.template_id}
                open={isExpanded}
                onOpenChange={(open) => {
                  setExpandedTemplateById((prev) => ({ ...prev, [source.template_id]: open }));
                }}
                className="rounded-md border"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium truncate">{source.template_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedCustomFieldCount}
                        {' / '}
                        {customFieldCount}
                        {' selected · '}
                        {source.submitted_task_count}
                        {' submitted tasks'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline">{visibleFields.length}</Badge>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t px-3 py-3">
                  {visibleFields.length > 0
                    ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {visibleFields.map((field) => {
                            const selected = isSelected(field.key);
                            return (
                              <div key={field.key} className="flex items-start space-x-2">
                                <Checkbox
                                  id={`field-${source.template_id}-${field.key}`}
                                  checked={selected}
                                  disabled={!selected && isAtLimit}
                                  onCheckedChange={(checked) => {
                                    toggleColumn(field.key, field.label, field.type, checked === true);
                                  }}
                                />
                                <div className="grid gap-1 leading-none">
                                  <Label htmlFor={`field-${source.template_id}-${field.key}`}>
                                    {field.label}
                                  </Label>
                                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {field.type}
                                    {' · '}
                                    {field.field_key}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    : (
                        <div className={cn('text-xs italic text-muted-foreground')}>
                          No fields match the current search/filter settings.
                        </div>
                      )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

type SortableSelectedColumnItemProps = {
  column: SelectedColumnDescriptor;
  index: number;
  total: number;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onRemove: () => void;
};

function SortableSelectedColumnItem({
  column,
  index,
  total,
  onMove,
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
