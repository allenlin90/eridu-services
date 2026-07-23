import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';
import { getFieldContentKey } from '@eridu/api-types/task-management';

import { resolveHydratedTaskSchema } from '@/features/tasks/lib/hydrate-task-schema';

export type TaskQcEvidence = {
  key: string;
  label: string;
  url: string;
};

export type TaskQcMetric = {
  key: 'gmv' | 'viewers' | 'ctr' | 'cto';
  label: string;
  value: string;
};

const IMAGE_EXTENSION_PATTERN = /\.(?:png|jpe?g|webp|gif|bmp)(?:\?.*)?$/i;
const METRIC_MATCHERS: Array<{
  key: TaskQcMetric['key'];
  label: string;
  matches: (normalized: string) => boolean;
}> = [
  { key: 'gmv', label: 'GMV', matches: (value) => /\bgmv\b|gross merchandise/.test(value) },
  { key: 'viewers', label: 'Viewers', matches: (value) => /viewer count|\bviewers?\b/.test(value) },
  { key: 'ctr', label: 'CTR', matches: (value) => /\bctr\b|click through/.test(value) },
  { key: 'cto', label: 'CTO', matches: (value) => /\bcto\b|click to order/.test(value) },
];

function isSafeRemoteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isLikelyImageUrl(value: string): boolean {
  return isSafeRemoteUrl(value) && IMAGE_EXTENSION_PATTERN.test(value);
}

export function getTaskQcEvidenceUrlsFromContent(content: unknown): string[] {
  const urls = new Set<string>();

  function visit(value: unknown): void {
    if (typeof value === 'string') {
      if (isLikelyImageUrl(value)) {
        urls.add(value);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  }

  visit(content);
  return Array.from(urls);
}

export function getTaskQcEvidence(
  task: Pick<TaskWithRelationsDto, 'snapshot' | 'content' | 'hydration_context'>,
): TaskQcEvidence[] {
  const schema = resolveHydratedTaskSchema(task);
  const content = (task.content as Record<string, unknown> | null) ?? {};
  if (!schema) {
    return getTaskQcEvidenceUrlsFromContent(content).map((url, index) => ({
      key: `image-${index + 1}`,
      label: `Screenshot ${index + 1}`,
      url,
    }));
  }

  return schema.items.flatMap((item) => {
    if (item.type !== 'file') {
      return [];
    }
    const contentKey = getFieldContentKey(schema, item);
    const value = content[contentKey];
    if (typeof value !== 'string' || !isSafeRemoteUrl(value)) {
      return [];
    }
    const acceptsImages = item.validation?.accept?.includes('image/') ?? false;
    if (!acceptsImages && !IMAGE_EXTENSION_PATTERN.test(value)) {
      return [];
    }
    return [{ key: contentKey, label: item.label, url: value }];
  });
}

export function getTaskQcMetrics(
  task: Pick<TaskWithRelationsDto, 'snapshot' | 'content' | 'hydration_context'>,
): TaskQcMetric[] {
  const schema = resolveHydratedTaskSchema(task);
  const content = (task.content as Record<string, unknown> | null) ?? {};
  if (!schema) {
    return [];
  }

  const metrics = new Map<TaskQcMetric['key'], TaskQcMetric>();
  for (const item of schema.items) {
    const contentKey = getFieldContentKey(schema, item);
    const rawValue = content[contentKey];
    if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
      continue;
    }
    const normalized = `${contentKey} ${item.key} ${item.label}`.toLowerCase().replace(/[_-]+/g, ' ');
    const matcher = METRIC_MATCHERS.find((candidate) => candidate.matches(normalized));
    if (!matcher || metrics.has(matcher.key)) {
      continue;
    }
    metrics.set(matcher.key, {
      key: matcher.key,
      label: matcher.label,
      value: String(rawValue),
    });
  }

  return METRIC_MATCHERS.flatMap((matcher) => {
    const metric = metrics.get(matcher.key);
    return metric ? [metric] : [];
  });
}
