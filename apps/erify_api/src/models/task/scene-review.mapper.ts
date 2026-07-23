import type {
  HydrationContext,
  SceneReviewDetail,
  SceneReviewEvidence,
  SceneReviewListItem,
  SceneReviewMetrics,
  TaskStatus,
  TaskType,
  UiSchema,
  UiSchemaV2,
} from '@eridu/api-types/task-management';
import {
  getFieldContentKey,
  getSchemaEngine,
  hydrateTaskFormSchema,
  safeParseTemplateSchema,
} from '@eridu/api-types/task-management';

export type TaskSceneReviewCandidate = {
  uid: string;
  type: TaskType;
  status: TaskStatus;
  content: unknown;
  metadata: unknown;
  updatedAt: Date;
  snapshot: { schema: unknown } | null;
  targets: Array<{
    show: {
      uid: string;
      name: string;
      startTime: Date;
      client: { uid: string; name: string } | null;
      showCreators: Array<{
        uid: string;
        creator: { name: string; aliasName: string };
      }>;
      showPlatforms: Array<{
        uid: string;
        platform: { uid: string; name: string };
      }>;
    } | null;
  }>;
};

const IMAGE_EXTENSION_PATTERN = /\.(?:png|jpe?g|webp|gif|bmp)(?:\?.*)?$/i;
const METRIC_MATCHERS: Array<{
  key: keyof SceneReviewMetrics;
  matches: (normalized: string) => boolean;
}> = [
  { key: 'gmv', matches: (value) => /\bgmv\b|gross merchandise/.test(value) },
  { key: 'viewers', matches: (value) => /viewer count|\bviewers?\b/.test(value) },
  { key: 'ctr', matches: (value) => /\bctr\b|click through/.test(value) },
  { key: 'cto', matches: (value) => /\bcto\b|click to order/.test(value) },
];

function isSafeRemoteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function buildHydrationContext(
  show: NonNullable<TaskSceneReviewCandidate['targets'][number]['show']>,
): HydrationContext {
  return {
    creators: show.showCreators.map((item) => ({
      uid: item.uid,
      label: item.creator.aliasName || item.creator.name,
    })),
    platforms: show.showPlatforms.map((item) => ({
      uid: item.uid,
      label: item.platform.name,
    })),
  };
}

function resolveSchema(
  rawSchema: unknown,
  content: Record<string, unknown>,
  hydrationContext: HydrationContext,
): UiSchema | UiSchemaV2 | null {
  const parsed = safeParseTemplateSchema(rawSchema);
  if (!parsed.success) {
    return null;
  }
  const schema = parsed.data;
  if (
    getSchemaEngine(schema) === 'task_template_v2'
    && schema.items.some((item) => Boolean((item as UiSchemaV2['items'][number]).system_fact_key))
  ) {
    return hydrateTaskFormSchema(schema as UiSchemaV2, hydrationContext, content);
  }
  return schema;
}

function findFallbackEvidence(content: unknown): SceneReviewEvidence[] {
  const urls = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      if (isSafeRemoteUrl(value) && IMAGE_EXTENSION_PATTERN.test(value)) {
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
  };
  visit(content);
  return Array.from(urls, (url, index) => ({
    key: `image-${index + 1}`,
    label: `Screenshot ${index + 1}`,
    url,
  }));
}

function extractEvidence(
  schema: UiSchema | UiSchemaV2 | null,
  content: Record<string, unknown>,
): SceneReviewEvidence[] {
  if (!schema) {
    return findFallbackEvidence(content);
  }
  const seen = new Set<string>();
  return schema.items.flatMap((item) => {
    if (item.type !== 'file') {
      return [];
    }
    const key = getFieldContentKey(schema, item);
    const value = content[key];
    if (typeof value !== 'string' || !isSafeRemoteUrl(value) || seen.has(value)) {
      return [];
    }
    const acceptsImages = item.validation?.accept?.includes('image/') ?? false;
    if (!acceptsImages && !IMAGE_EXTENSION_PATTERN.test(value)) {
      return [];
    }
    seen.add(value);
    return [{ key, label: item.label, url: value }];
  });
}

function extractMetrics(
  schema: UiSchema | UiSchemaV2 | null,
  content: Record<string, unknown>,
): SceneReviewMetrics {
  if (!schema) {
    return {};
  }
  const metrics: SceneReviewMetrics = {};
  for (const item of schema.items) {
    const contentKey = getFieldContentKey(schema, item);
    const rawValue = content[contentKey];
    if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
      continue;
    }
    const normalized = `${contentKey} ${item.key} ${item.label}`.toLowerCase().replace(/[_-]+/g, ' ');
    const matcher = METRIC_MATCHERS.find((candidate) => candidate.matches(normalized));
    if (matcher && metrics[matcher.key] === undefined) {
      metrics[matcher.key] = String(rawValue);
    }
  }
  return metrics;
}

function extractSubmittedAt(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  const audit = (metadata as Record<string, unknown>).audit;
  if (!audit || typeof audit !== 'object') {
    return null;
  }
  const transition = (audit as Record<string, unknown>).last_transition;
  if (!transition || typeof transition !== 'object') {
    return null;
  }
  const { to, at } = transition as Record<string, unknown>;
  if (to !== 'REVIEW' || typeof at !== 'string' || Number.isNaN(Date.parse(at))) {
    return null;
  }
  return new Date(at).toISOString();
}

export function mapSceneReviewDetail(task: TaskSceneReviewCandidate): SceneReviewDetail | null {
  const show = task.targets[0]?.show;
  if (!show) {
    return null;
  }
  const content = task.content && typeof task.content === 'object' && !Array.isArray(task.content)
    ? task.content as Record<string, unknown>
    : {};
  const hydrationContext = buildHydrationContext(show);
  const schema = task.snapshot?.schema
    ? resolveSchema(task.snapshot.schema, content, hydrationContext)
    : null;
  const evidence = extractEvidence(schema, content);
  if (evidence.length === 0) {
    return null;
  }

  return {
    task_id: task.uid,
    task_type: task.type,
    status: task.status,
    submitted_at: extractSubmittedAt(task.metadata),
    activity_at: task.updatedAt.toISOString(),
    show: {
      id: show.uid,
      name: show.name,
      start_time: show.startTime.toISOString(),
    },
    client: show.client ? { id: show.client.uid, name: show.client.name } : null,
    platforms: show.showPlatforms.map((item) => ({
      id: item.platform.uid,
      name: item.platform.name,
    })),
    metrics: extractMetrics(schema, content),
    evidence,
    schema: task.snapshot?.schema ?? null,
    content: Object.keys(content).length > 0 ? content : null,
    hydration_context: hydrationContext,
    reference: null,
  };
}

export function mapSceneReviewCandidate(task: TaskSceneReviewCandidate): SceneReviewListItem | null {
  const detail = mapSceneReviewDetail(task);
  if (!detail) {
    return null;
  }
  return {
    task_id: detail.task_id,
    task_type: detail.task_type,
    status: detail.status,
    submitted_at: detail.submitted_at,
    activity_at: detail.activity_at,
    show: detail.show,
    client: detail.client,
    platforms: detail.platforms,
    metrics: detail.metrics,
    preview: detail.evidence[0]!,
    evidence_count: detail.evidence.length,
    evidence_labels: detail.evidence.map((item) => item.label),
    reference_available: false,
  };
}
