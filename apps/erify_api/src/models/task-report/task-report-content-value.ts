import {
  type FieldItem,
  getTaskContentExtraKey,
  getTaskContentReasonKey,
} from '@eridu/api-types/task-management';

type ReportField = Pick<FieldItem, 'id' | 'key' | 'label' | 'type'>;
type FieldType = FieldItem['type'];

const VALUE_KEYS = new Set(['value', 'selected_value', 'selectedValue', 'output', 'answer']);
const EXTRA_CONTAINER_KEYS = new Set(['extra', 'extras', 'metadata']);

type ExtractedInputValue = {
  value: unknown;
  extras: Map<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isBlankExtraValue(value: unknown): boolean {
  return value === null
    || value === undefined
    || (typeof value === 'string' && value.trim().length === 0);
}

function stringifyCellPart(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => stringifyCellPart(item)).join('; ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (isRecord(value)) {
    return JSON.stringify(value);
  }
  return String(value);
}

function humanizeExtraKey(key: string): string {
  if (key === 'reason' || key === 'explanation') {
    return 'Explanation';
  }

  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function addExtra(extras: Map<string, unknown>, key: string, value: unknown): void {
  if (isBlankExtraValue(value)) {
    return;
  }

  extras.set(humanizeExtraKey(key), value);
}

function addExtraRecord(extras: Map<string, unknown>, value: unknown): void {
  if (!isRecord(value)) {
    return;
  }

  for (const [key, item] of Object.entries(value)) {
    addExtra(extras, key, item);
  }
}

function readInputValue(rawValue: unknown): ExtractedInputValue {
  const extras = new Map<string, unknown>();

  if (!isRecord(rawValue)) {
    return { value: rawValue, extras };
  }

  let value: unknown = rawValue;
  for (const key of VALUE_KEYS) {
    if (Object.hasOwn(rawValue, key)) {
      value = rawValue[key];
      break;
    }
  }

  for (const [key, item] of Object.entries(rawValue)) {
    if (VALUE_KEYS.has(key) || key === 'label') {
      continue;
    }
    if (EXTRA_CONTAINER_KEYS.has(key)) {
      addExtraRecord(extras, item);
      continue;
    }
    addExtra(extras, key, item);
  }

  return { value, extras };
}

function readStoredValue(
  contentRecord: Record<string, unknown>,
  field: ReportField,
): { storageKey: string; rawValue: unknown } {
  if (Object.hasOwn(contentRecord, field.key)) {
    return { storageKey: field.key, rawValue: contentRecord[field.key] };
  }

  if (Object.hasOwn(contentRecord, field.id)) {
    return { storageKey: field.id, rawValue: contentRecord[field.id] };
  }

  return { storageKey: field.key, rawValue: undefined };
}

function normalizeFieldValue(value: unknown, type: FieldType): unknown {
  if (value === undefined || value === null) {
    return null;
  }

  switch (type) {
    case 'number': {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
      }
      const coerced = Number(value);
      return Number.isFinite(coerced) ? coerced : null;
    }
    case 'checkbox':
      if (typeof value === 'boolean') {
        return value;
      }
      return String(value).toLowerCase() === 'true';
    case 'multiselect':
      return Array.isArray(value) ? value.map((item) => String(item)) : null;
    case 'date':
    case 'datetime':
    case 'file':
    case 'url':
    case 'select':
    case 'text':
    case 'textarea':
      return String(value);
    default:
      return value;
  }
}

function addSidecarExtras(
  extras: Map<string, unknown>,
  contentRecord: Record<string, unknown>,
  field: ReportField,
  storageKey: string,
): void {
  const candidateKeys = new Set([storageKey, field.key, field.id]);

  for (const key of candidateKeys) {
    addExtra(extras, 'explanation', contentRecord[getTaskContentReasonKey(key)]);
  }

  for (const key of candidateKeys) {
    addExtraRecord(extras, contentRecord[getTaskContentExtraKey(key)]);
  }
}

function combineValueAndExtras(value: unknown, extras: Map<string, unknown>): unknown {
  if (extras.size === 0) {
    return value;
  }

  const lines: string[] = [];
  if (value !== null && value !== undefined) {
    lines.push(stringifyCellPart(value));
  }

  for (const [label, extraValue] of extras.entries()) {
    lines.push(`${label}: ${stringifyCellPart(extraValue)}`);
  }

  return lines.join('\n');
}

export function normalizeTaskReportContentValue(
  contentRecord: Record<string, unknown>,
  field: ReportField,
): unknown {
  const { storageKey, rawValue } = readStoredValue(contentRecord, field);
  const inputValue = readInputValue(rawValue);
  const extras = new Map(inputValue.extras);

  addSidecarExtras(extras, contentRecord, field, storageKey);

  const normalizedValue = normalizeFieldValue(inputValue.value, field.type);
  return combineValueAndExtras(normalizedValue, extras);
}
