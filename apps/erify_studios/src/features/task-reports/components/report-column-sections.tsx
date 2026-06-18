import { ChevronDown, ChevronUp } from 'lucide-react';

import {
  Badge,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Label,
} from '@eridu/ui';
import { cn } from '@eridu/ui/lib/utils';

import type {
  SharedFieldCategoryGroup,
  SystemColumn,
  TemplatePanel,
  ToggleColumnFn,
} from './report-column-picker.types';
import { SHARED_FIELD_CATEGORY_LABELS } from './report-column-picker.utils';

/** Read-only summary tiles describing the columns available within the current scope. */
export function ScopeStatsGrid({
  templateCount,
  submittedTaskCount,
  customFieldCount,
  sharedFieldCount,
}: {
  templateCount: number;
  submittedTaskCount: number;
  customFieldCount: number;
  sharedFieldCount: number;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-md border px-3 py-2">
        <div className="text-xs text-muted-foreground">Templates in scope</div>
        <div className="text-lg font-semibold">{templateCount}</div>
      </div>
      <div className="rounded-md border px-3 py-2">
        <div className="text-xs text-muted-foreground">Submitted tasks in scope</div>
        <div className="text-lg font-semibold">{submittedTaskCount}</div>
      </div>
      <div className="rounded-md border px-3 py-2">
        <div className="text-xs text-muted-foreground">Custom field options</div>
        <div className="text-lg font-semibold">{customFieldCount}</div>
      </div>
      <div className="rounded-md border px-3 py-2">
        <div className="text-xs text-muted-foreground">Shared field options</div>
        <div className="text-lg font-semibold">{sharedFieldCount}</div>
      </div>
    </div>
  );
}

/** Checkbox grid of built-in system columns. Selection is delegated via `onToggle`. */
export function SystemFieldsSection({
  columns,
  isSelected,
  isAtLimit,
  onToggle,
}: {
  columns: SystemColumn[];
  isSelected: (fieldKey: string) => boolean;
  isAtLimit: boolean;
  onToggle: ToggleColumnFn;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-1">
        <div className="text-sm font-medium">System Fields</div>
        <Badge variant="outline">{columns.length}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {columns.map((column) => {
          const selected = isSelected(column.key);
          return (
            <div key={column.key} className="flex items-start space-x-2">
              <Checkbox
                id={`field-sys-${column.key}`}
                checked={selected}
                disabled={!selected && isAtLimit}
                onCheckedChange={(checked) => {
                  onToggle(column.key, column.label, undefined, checked === true);
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
  );
}

/** Shared fields grouped by category, each canonical field expanding to its selectable per-loop columns. */
export function SharedFieldsSection({
  groups,
  isSelected,
  isAtLimit,
  onToggle,
}: {
  groups: SharedFieldCategoryGroup[];
  isSelected: (fieldKey: string) => boolean;
  isAtLimit: boolean;
  onToggle: ToggleColumnFn;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-1">
        <div className="text-sm font-medium">Shared Fields</div>
        <Badge variant="outline">
          {groups.reduce((total, group) => total + group.fields.reduce((acc, field) => acc + field.visibleDerivedColumns.length, 0), 0)}
        </Badge>
      </div>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.category} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {SHARED_FIELD_CATEGORY_LABELS[group.category as keyof typeof SHARED_FIELD_CATEGORY_LABELS] ?? group.category}
              </div>
              <Badge variant="outline">{group.fields.length}</Badge>
            </div>
            <div className="space-y-3">
              {group.fields.map((field) => (
                <div key={field.key} className="rounded-md border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">{field.label}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {field.type}
                        {' · '}
                        {field.key}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {field.visibleDerivedColumns.length}
                      {' '}
                      column
                      {field.visibleDerivedColumns.length === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {field.visibleDerivedColumns.map((column) => {
                      const selected = isSelected(column.key);
                      return (
                        <div key={column.key} className="flex items-start space-x-2">
                          <Checkbox
                            id={`field-shared-${field.key}-${column.key}`}
                            checked={selected}
                            disabled={!selected && isAtLimit}
                            onCheckedChange={(checked) => {
                              onToggle(column.key, column.label, column.type, checked === true);
                            }}
                          />
                          <div className="grid gap-0.5 leading-none">
                            <Label htmlFor={`field-shared-${field.key}-${column.key}`}>
                              {column.group ? `Loop ${column.group.replace(/^l/, '')}` : column.label}
                            </Label>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {column.key}
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
        ))}
      </div>
    </div>
  );
}

/** Collapsible panels of template-specific custom fields. Expansion is owned by the picker. */
export function TemplateFieldsSection({
  panels,
  expandedTemplateById,
  onExpandedChange,
  isSelected,
  isAtLimit,
  onToggle,
}: {
  panels: TemplatePanel[];
  expandedTemplateById: Record<string, boolean>;
  onExpandedChange: (templateId: string, open: boolean) => void;
  isSelected: (fieldKey: string) => boolean;
  isAtLimit: boolean;
  onToggle: ToggleColumnFn;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-1">
        <div className="text-sm font-medium">Template-Specific Fields</div>
        <Badge variant="outline">{panels.length}</Badge>
      </div>

      {panels.map((panel) => {
        const { source, visibleFields, customFieldCount, selectedCustomFieldCount } = panel;
        const isExpanded = expandedTemplateById[source.template_id] ?? false;
        return (
          <Collapsible
            key={source.template_id}
            open={isExpanded}
            onOpenChange={(open) => {
              onExpandedChange(source.template_id, open);
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
                                onToggle(field.key, field.label, field.type, checked === true);
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
  );
}
