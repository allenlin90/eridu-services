import type { FieldItem, SystemFactKey } from './schema';
import { SYSTEM_FACT_KEY_DEFINITIONS } from './schema';

/** File MIME/extension choices offered for `file` fields. */
export const FILE_TYPE_OPTIONS = [
  { label: 'Image', value: 'image/*' },
  { label: 'Video', value: 'video/*' },
  { label: 'PDF', value: '.pdf' },
  { label: 'CSV', value: '.csv' },
  { label: 'Text', value: 'text/plain' },
];

/** Sentinel value the system-fact combobox uses for the "no binding" choice. */
export const SYSTEM_FACT_NONE_VALUE = 'none';

/** Flattened system-fact definitions for the combobox option list. */
export const SYSTEM_FACT_OPTIONS = Object.entries(SYSTEM_FACT_KEY_DEFINITIONS).map(([value, definition]) => ({
  value: value as SystemFactKey,
  ...definition,
}));

/** System facts that force an explanation rule when bound (e.g. attendance no-show). */
export const EXPLANATION_REQUIRED_FACT_KEYS: ReadonlySet<SystemFactKey> = new Set([
  'creator_attendance_missing',
]);

/** Stable empty array so `require_reason` defaults keep a referentially stable value. */
export const EMPTY_ARRAY: any[] = [];

/** Reads the optional `system_fact_key` off a field item without widening its type. */
export function getSystemFactKey(item: FieldItem): SystemFactKey | undefined {
  return 'system_fact_key' in item ? item.system_fact_key : undefined;
}
