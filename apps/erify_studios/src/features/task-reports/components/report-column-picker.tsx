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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Loader2, Search, X } from 'lucide-react';
import * as React from 'react';

import type { TaskReportSelectedColumn } from '@eridu/api-types/task-management';
import {
  Badge,
  Button,
  Input,
} from '@eridu/ui';

import { useTaskReportSources } from '../hooks/use-task-report-sources';

import type {
  DerivedSharedColumn,
  ReportColumnPickerProps,
  SelectedColumnDescriptor,
  SharedFieldCategoryGroup,
  TemplatePanel,
} from './report-column-picker.types';
import {
  DEFAULT_EXPANDED_TEMPLATE_COUNT,
  extractTemplateIdFromColumnKey,
  isSharedSourceField,
  LARGE_SCOPE_TEMPLATE_THRESHOLD,
  MAX_COLUMNS,
  normalized,
  SOFT_WARNING_THRESHOLD,
  SYSTEM_COLUMNS,
} from './report-column-picker.utils';
import {
  ScopeStatsGrid,
  SharedFieldsSection,
  SystemFieldsSection,
  TemplateFieldsSection,
} from './report-column-sections';
import { SortableSelectedColumnItem } from './sortable-selected-column-item';

/**
 * Column picker for the task-report builder. This component is the composition
 * root and the single owner of all picker state and derivations; the extracted
 * pieces are pure presentation that read derived data and delegate mutations:
 *
 *   ReportColumnPicker (state + derivations + filtering)
 *   ├─ useTaskReportSources ............ source/shared-field discovery query
 *   ├─ ScopeStatsGrid .................. read-only scope summary tiles
 *   ├─ SortableSelectedColumnItem[] .... ordered selection list (dnd reorder)
 *   ├─ SystemFieldsSection ............. built-in column checkboxes
 *   ├─ SharedFieldsSection ............. canonical shared fields → per-loop columns
 *   └─ TemplateFieldsSection ........... collapsible per-template custom fields
 *
 * Selection/order/expansion live here; sections fire `toggleColumn`,
 * `onChange`, and expansion callbacks back up rather than holding their own
 * state. Helpers, constants, and shared types live in the sibling
 * `report-column-picker.utils.ts` / `.types.ts` modules.
 */
export function ReportColumnPicker({
  studioId,
  scope,
  selectedColumns,
  onChange,
  sourcesData: propSourcesData,
}: ReportColumnPickerProps) {
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // When propSourcesData is provided by the parent, skip the internal fetch to avoid a duplicate request.
  const { data: fetchedSourcesData, isLoading, isError } = useTaskReportSources(
    studioId,
    propSourcesData !== undefined ? null : scope,
  );
  const activeSourcesData = propSourcesData ?? fetchedSourcesData;
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSelectedOnly, setShowSelectedOnly] = React.useState(false);
  const [showTemplatesWithSelectedColumnsOnly, setShowTemplatesWithSelectedColumnsOnly] = React.useState(false);
  const [expandedTemplateById, setExpandedTemplateById] = React.useState<Record<string, boolean>>({});
  const sources = React.useMemo(() => {
    const raw = activeSourcesData?.sources ?? [];
    // When sources are passed from the parent (unfiltered by source_templates), apply the filter client-side.
    if (!propSourcesData || !scope?.source_templates?.length)
      return raw;
    return raw.filter((s) => scope.source_templates!.includes(s.template_id));
  }, [activeSourcesData, propSourcesData, scope]);
  const sharedFields = React.useMemo(() => {
    const raw = activeSourcesData?.shared_fields ?? [];
    // Keep shared fields aligned with selected templates when parent-injected sources are unfiltered.
    if (!propSourcesData || !scope?.source_templates?.length)
      return raw;
    // Engine-aware: v1 fields use `standard`; v2 fields use `shared_field_key`
    // (canonical post-cleanup, e.g. `gmv` for loop column `gmv_l1`).
    const sharedRegistryKeysInScope = new Set<string>();
    for (const source of sources) {
      for (const field of source.fields) {
        if (field.shared_field_key) {
          sharedRegistryKeysInScope.add(field.shared_field_key);
        } else if (field.standard) {
          sharedRegistryKeysInScope.add(field.key);
        }
      }
    }
    return raw.filter((sharedField) => sharedRegistryKeysInScope.has(sharedField.key));
  }, [activeSourcesData?.shared_fields, propSourcesData, scope, sources]);
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

  const updateSelectedColumnIncludeExtra = React.useCallback((columnKey: string, includeExtra: boolean) => {
    onChange(selectedColumns.map((column) => {
      if (column.key !== columnKey) {
        return column;
      }
      return {
        ...column,
        include_extra: includeExtra ? true : undefined,
      };
    }));
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

  // Map each canonical shared-field entry to the actual loop-scoped column
  // descriptors that appear in source data — that's what the user can pick.
  // The bare canonical name (e.g. `gmv`) is only itself selectable when a
  // non-grouped source field projects directly to it (e.g. an unsuffixed
  // `session_review_feedback` shared field on a non-moderation template).
  const derivedSharedColumnsByKey = React.useMemo(() => {
    const map = new Map<string, Map<string, DerivedSharedColumn>>();
    for (const source of sortedSources) {
      for (const field of source.fields) {
        const sharedKey = field.shared_field_key;
        if (!sharedKey) {
          continue;
        }
        const inner = map.get(sharedKey) ?? new Map<string, DerivedSharedColumn>();
        if (!inner.has(field.key)) {
          inner.set(field.key, {
            key: field.key,
            label: field.label,
            type: field.type,
            group: field.group ?? undefined,
          });
        }
        map.set(sharedKey, inner);
      }
    }
    return map;
  }, [sortedSources]);

  const selectedColumnDescriptors = React.useMemo(() => selectedColumns.map((column): SelectedColumnDescriptor => {
    const systemColumn = systemColumnMap.get(column.key);
    if (systemColumn) {
      return { ...column, groupLabel: 'System', detail: column.key, canIncludeExtra: false };
    }

    const directField = templateFieldByKey.get(column.key)?.field;
    const sharedField = sharedFieldByKey.get(column.key);
    if (sharedField && directField && isSharedSourceField(directField)) {
      return { ...column, groupLabel: 'Shared', detail: `${sharedField.type} · ${sharedField.key}`, canIncludeExtra: true };
    }

    // The selected column may be a per-loop derived column (e.g. `gmv_l8`)
    // whose canonical entry lives in `sharedFieldByKey` under the base key
    // `gmv`. Look it up via the descriptor map built from source fields.
    for (const [sharedKey, derivedMap] of derivedSharedColumnsByKey.entries()) {
      const derived = derivedMap.get(column.key);
      if (derived) {
        const canonical = sharedFieldByKey.get(sharedKey);
        const groupSuffix = derived.group ? ` · Loop ${derived.group.replace(/^l/, '')}` : '';
        return {
          ...column,
          groupLabel: canonical?.label ? `Shared · ${canonical.label}` : 'Shared',
          detail: `${derived.type} · ${derived.key}${groupSuffix}`,
          canIncludeExtra: true,
        };
      }
    }

    const templateField = templateFieldByKey.get(column.key);
    if (templateField) {
      return {
        ...column,
        groupLabel: templateField.source.template_name,
        detail: `${templateField.field.type} · ${templateField.field.field_key}`,
        canIncludeExtra: true,
      };
    }

    return { ...column, groupLabel: 'Unavailable', detail: column.key, canIncludeExtra: false };
  }), [selectedColumns, systemColumnMap, sharedFieldByKey, templateFieldByKey, derivedSharedColumnsByKey]);

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

  if (isError || !activeSourcesData) {
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

  const filteredSharedFieldsByCategory: SharedFieldCategoryGroup[] = Object.entries(sharedFieldsByCategory)
    .map(([category, fields]) => {
      const filteredFields = fields
        .map((field) => {
          const derivedMap = derivedSharedColumnsByKey.get(field.key);
          // Sort loop columns by their numeric loop ordinal when available; fall
          // back to lexical key otherwise (handles non-loop shared fields).
          const derivedColumns = [...(derivedMap?.values() ?? [])].sort((a, b) => {
            const ag = a.group ? Number.parseInt(a.group.replace(/^l/, ''), 10) : Number.NaN;
            const bg = b.group ? Number.parseInt(b.group.replace(/^l/, ''), 10) : Number.NaN;
            if (Number.isFinite(ag) && Number.isFinite(bg)) {
              return ag - bg;
            }
            return a.key.localeCompare(b.key);
          });
          const visibleDerivedColumns = derivedColumns.filter((column) => {
            if (showSelectedOnly && !isSelected(column.key)) {
              return false;
            }
            return matchesSearch([field.label, field.key, field.type, category, column.label, column.key]);
          });
          return { ...field, derivedColumns, visibleDerivedColumns };
        })
        .filter((field) => field.visibleDerivedColumns.length > 0);
      return { category, fields: filteredFields };
    })
    .filter((group) => group.fields.length > 0);

  const templatePanels: TemplatePanel[] = sortedSources
    .map((source) => {
      const customFields = source.fields.filter((field) => !isSharedSourceField(field));
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
    total + source.fields.filter((field) => !isSharedSourceField(field)).length
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
      <ScopeStatsGrid
        templateCount={sortedSources.length}
        submittedTaskCount={totalSubmittedTaskCount}
        customFieldCount={totalCustomFieldCount}
        sharedFieldCount={sharedFields.length}
      />

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
                  onIncludeExtraChange={updateSelectedColumnIncludeExtra}
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
        <SystemFieldsSection
          columns={filteredSystemColumns}
          isSelected={isSelected}
          isAtLimit={isAtLimit}
          onToggle={toggleColumn}
        />
      )}

      {filteredSharedFieldsByCategory.length > 0 && (
        <SharedFieldsSection
          groups={filteredSharedFieldsByCategory}
          isSelected={isSelected}
          isAtLimit={isAtLimit}
          onToggle={toggleColumn}
        />
      )}

      {templatePanels.length > 0 && (
        <TemplateFieldsSection
          panels={templatePanels}
          expandedTemplateById={expandedTemplateById}
          onExpandedChange={(templateId, open) => {
            setExpandedTemplateById((prev) => ({ ...prev, [templateId]: open }));
          }}
          isSelected={isSelected}
          isAtLimit={isAtLimit}
          onToggle={toggleColumn}
        />
      )}
    </div>
  );
}
