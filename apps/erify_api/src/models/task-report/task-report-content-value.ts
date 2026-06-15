import {
  type FieldItem,
  getTaskContentExtraKey,
  getTaskContentReasonKey,
  parseHydratedContentKey,
  type SystemFactKey,
  TASK_CONTENT_EXTRA_SUFFIX,
  TASK_CONTENT_REASON_SUFFIX,
} from '@eridu/api-types/task-management';

type ReportField = Pick<FieldItem, 'key' | 'type'> & {
  systemFactKey?: SystemFactKey;
};
type FieldType = FieldItem['type'];
type PlatformPerformanceFactKey =
  | 'show_platform_gmv'
  | 'show_platform_view_count'
  | 'show_platform_ctr'
  | 'show_platform_cto';

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

function readHydratedFieldValues(
  contentRecord: Record<string, unknown>,
  fieldKey: string,
): unknown[] {
  return Object.entries(contentRecord).flatMap(([contentKey, value]) => {
    if (
      contentKey.endsWith(TASK_CONTENT_REASON_SUFFIX)
      || contentKey.endsWith(TASK_CONTENT_EXTRA_SUFFIX)
    ) {
      return [];
    }
    const parsed = parseHydratedContentKey(contentKey);
    return parsed?.fieldId === fieldKey ? [value] : [];
  });
}

function isPlatformPerformanceFactKey(
  systemFactKey: SystemFactKey | undefined,
): systemFactKey is PlatformPerformanceFactKey {
  return systemFactKey === 'show_platform_gmv'
    || systemFactKey === 'show_platform_view_count'
    || systemFactKey === 'show_platform_ctr'
    || systemFactKey === 'show_platform_cto';
}

function aggregatePerformanceValues(
  values: unknown[],
  type: FieldType,
  systemFactKey: PlatformPerformanceFactKey,
): unknown {
  const normalizedValues = values
    .map((value) => normalizeFieldValue(value, type))
    .filter((value): value is number => typeof value === 'number');

  if (normalizedValues.length === 0) {
    return null;
  }
  if (normalizedValues.length === 1) {
    return normalizedValues[0];
  }

  const total = normalizedValues.reduce((sum, value) => sum + value, 0);
  switch (systemFactKey) {
    case 'show_platform_gmv':
    case 'show_platform_view_count':
      return total;
    case 'show_platform_ctr':
    case 'show_platform_cto':
      return total / normalizedValues.length;
    default:
      return null;
  }
}

function resolveFieldValue(
  contentRecord: Record<string, unknown>,
  field: ReportField,
): unknown {
  if (isPlatformPerformanceFactKey(field.systemFactKey)) {
    const hydratedValues = readHydratedFieldValues(contentRecord, field.key);
    if (hydratedValues.length > 0) {
      return aggregatePerformanceValues(hydratedValues, field.type, field.systemFactKey);
    }
  }

  return normalizeFieldValue(contentRecord[field.key], field.type);
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
    value: resolveFieldValue(contentRecord, field),
    extra: formatInputExtra(contentRecord, field.key),
  };
}
