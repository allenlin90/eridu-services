import {
  type FieldItem,
  getTaskContentExtraKey,
  getTaskContentReasonKey,
} from '@eridu/api-types/task-management';

type ReportField = Pick<FieldItem, 'key' | 'type'>;
type FieldType = FieldItem['type'];

type ProjectedInput = {
  value: unknown;
  extra: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isBlankExtraValue(value: unknown): boolean {
  return value === null
    || value === undefined
    || (typeof value === 'string' && value.trim().length === 0);
}

function stringifyExtraValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => stringifyExtraValue(item)).join('; ');
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
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
      // A submitted-but-blank numeric field is "not reported", not 0.
      // `Number('')` / `Number('   ')` coerce to a finite 0, fabricating a
      // value, so reject blank/whitespace strings before coercion (D9/WI-34).
      if (typeof value === 'string' && value.trim().length === 0) {
        return null;
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

function formatInputExtra(contentRecord: Record<string, unknown>, fieldKey: string): string | null {
  const lines: string[] = [];
  const reason = contentRecord[getTaskContentReasonKey(fieldKey)];
  if (!isBlankExtraValue(reason)) {
    lines.push(`Explanation: ${stringifyExtraValue(reason)}`);
  }

  const extra = contentRecord[getTaskContentExtraKey(fieldKey)];
  if (isRecord(extra)) {
    for (const [key, value] of Object.entries(extra)) {
      if (!isBlankExtraValue(value)) {
        lines.push(`${humanizeExtraKey(key)}: ${stringifyExtraValue(value)}`);
      }
    }
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

export function projectTaskReportContentInput(
  contentRecord: Record<string, unknown>,
  field: ReportField,
): ProjectedInput {
  return {
    value: normalizeFieldValue(contentRecord[field.key], field.type),
    extra: formatInputExtra(contentRecord, field.key),
  };
}
