import { Loader2 } from 'lucide-react';
import * as React from 'react';

import type { TaskReportScope, TaskReportSelectedColumn } from '@eridu/api-types/task-management';
import { TASK_REPORT_SYSTEM_COLUMN } from '@eridu/api-types/task-management';
import { Checkbox, Label } from '@eridu/ui';

import { useTaskReportSources } from '../hooks/use-task-report-sources';

type ReportColumnPickerProps = {
  studioId: string;
  scope: TaskReportScope | null;
  selectedColumns: TaskReportSelectedColumn[];
  onChange: (columns: TaskReportSelectedColumn[]) => void;
};

const SYSTEM_COLUMNS = [
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_NAME, label: 'Show Name' },
  { key: TASK_REPORT_SYSTEM_COLUMN.CLIENT_NAME, label: 'Client Name' },
  { key: TASK_REPORT_SYSTEM_COLUMN.START_TIME, label: 'Start Time' },
  { key: TASK_REPORT_SYSTEM_COLUMN.END_TIME, label: 'End Time' },
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_TYPE_NAME, label: 'Show Type' },
  { key: TASK_REPORT_SYSTEM_COLUMN.STUDIO_ROOM_NAME, label: 'Room' },
];

export function ReportColumnPicker({
  studioId,
  scope,
  selectedColumns,
  onChange,
}: ReportColumnPickerProps) {
  const { data: sourcesData, isLoading, isError } = useTaskReportSources(studioId, scope);

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

  const { sources, shared_fields } = sourcesData;

  const toggleColumn = (fieldKey: string, fieldLabel: string, fieldType?: string, checked?: boolean) => {
    if (checked) {
      if (selectedColumns.length >= 50)
        return;
      onChange([...selectedColumns, { key: fieldKey, label: fieldLabel, type: fieldType as any }]);
    } else {
      onChange(selectedColumns.filter((c) => c.key !== fieldKey));
    }
  };

  const isSelected = (fieldKey: string) => {
    return selectedColumns.some((c) => c.key === fieldKey);
  };

  const isAtLimit = selectedColumns.length >= 50;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 pb-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Selected Columns</div>
          <div className={`text-sm ${isAtLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
            {selectedColumns.length}
            {' '}
            of 50 selected
          </div>
        </div>
        {selectedColumns.length >= 30 && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            Wide tables are best reviewed in the exported spreadsheet. The table preview may require horizontal scrolling.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="font-medium text-sm border-b pb-1">
          System Fields
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {SYSTEM_COLUMNS.map((col) => (
            <div key={col.key} className="flex items-start space-x-2">
              <Checkbox
                id={`field-sys-${col.key}`}
                checked={isSelected(col.key)}
                disabled={!isSelected(col.key) && isAtLimit}
                onCheckedChange={(checked) => toggleColumn(col.key, col.label, undefined, checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor={`field-sys-${col.key}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {col.label}
                </Label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {shared_fields.length > 0 && (
        <div className="space-y-3">
          <div className="font-medium text-sm border-b pb-1">
            Shared Fields
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {shared_fields.map((field) => (
              <div key={field.key} className="flex items-start space-x-2">
                <Checkbox
                  id={`field-shared-${field.key}`}
                  checked={isSelected(field.key)}
                  disabled={!isSelected(field.key) && isAtLimit}
                  onCheckedChange={(checked) => toggleColumn(field.key, field.label, field.type, checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor={`field-shared-${field.key}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field.label}
                  </Label>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {field.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sources.map((source) => (
        <div key={source.template_id} className="space-y-3">
          <div className="font-medium text-sm border-b pb-1">
            Template:
            {' '}
            {source.template_name}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {source.fields.filter((f) => !f.standard).map((field) => (
              <div key={field.key} className="flex items-start space-x-2">
                <Checkbox
                  id={`field-${source.template_id}-${field.key}`}
                  checked={isSelected(field.key)}
                  disabled={!isSelected(field.key) && isAtLimit}
                  onCheckedChange={(checked) => toggleColumn(field.key, field.label, field.type, checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor={`field-${source.template_id}-${field.key}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field.label}
                  </Label>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {field.type}
                  </p>
                </div>
              </div>
            ))}
            {source.fields.filter((f) => !f.standard).length === 0 && (
              <div className="text-xs text-muted-foreground italic col-span-full">No custom fields in this template.</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
