import { TASK_REPORT_SYSTEM_COLUMN } from '@eridu/api-types/task-management';

import type { SystemColumn } from './report-column-picker.types';

/** Hard cap on selectable columns (run endpoint + export contract). */
export const MAX_COLUMNS = 50;
/** At/above this count, warn that wide tables are best read in the export. */
export const SOFT_WARNING_THRESHOLD = 30;
/** Above this many in-scope templates, collapse panels by default. */
export const LARGE_SCOPE_TEMPLATE_THRESHOLD = 10;
/** How many template panels stay expanded by default in a large scope. */
export const DEFAULT_EXPANDED_TEMPLATE_COUNT = 3;

/** Built-in (non-template) columns always available to the picker. */
export const SYSTEM_COLUMNS: SystemColumn[] = [
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_ID, label: 'Show ID' },
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_NAME, label: 'Show Name' },
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_EXTERNAL_ID, label: 'Show External ID' },
  { key: TASK_REPORT_SYSTEM_COLUMN.CLIENT_NAME, label: 'Client Name' },
  { key: TASK_REPORT_SYSTEM_COLUMN.START_TIME, label: 'Start Time' },
  { key: TASK_REPORT_SYSTEM_COLUMN.END_TIME, label: 'End Time' },
  { key: TASK_REPORT_SYSTEM_COLUMN.ACTUAL_START_TIME, label: 'Actual Start' },
  { key: TASK_REPORT_SYSTEM_COLUMN.ACTUAL_END_TIME, label: 'Actual End' },
  { key: TASK_REPORT_SYSTEM_COLUMN.ACTUALS_STATUS, label: 'Actuals Status' },
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_STANDARD_NAME, label: 'Show Standard' },
  { key: TASK_REPORT_SYSTEM_COLUMN.SHOW_TYPE_NAME, label: 'Show Type' },
  { key: TASK_REPORT_SYSTEM_COLUMN.STUDIO_ROOM_NAME, label: 'Room' },
];

/** Display labels for the shared-field category buckets. */
export const SHARED_FIELD_CATEGORY_LABELS = {
  metric: 'Metrics',
  evidence: 'Evidence',
  status: 'Status',
} as const;

/** Lowercase + trim for case-insensitive search matching. */
export function normalized(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/** Returns the `{templateId}` prefix of a `{templateId}:...` column key, or null. */
export function extractTemplateIdFromColumnKey(columnKey: string): string | null {
  const splitIndex = columnKey.indexOf(':');
  if (splitIndex <= 0) {
    return null;
  }
  return columnKey.slice(0, splitIndex);
}

/** True for fields that belong to the merged shared-field group (v1 `standard`, v2 `shared_field_key`). */
export function isSharedSourceField(field: { standard?: boolean; shared_field_key?: string }): boolean {
  return field.standard === true || Boolean(field.shared_field_key);
}
