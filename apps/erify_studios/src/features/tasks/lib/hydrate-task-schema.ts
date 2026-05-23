import type {
  HydratedUiSchemaV2,
  TaskWithRelationsDto,
  UiSchema,
  UiSchemaV2,
} from '@eridu/api-types/task-management';
import {
  getFieldContentKey,
  getSchemaEngine,
  getTaskContentExtraKey,
  getTaskContentReasonKey,
  hydrateTaskFormSchema,
} from '@eridu/api-types/task-management';

import { resolveUiSchema } from './resolve-ui-schema';

export type ResolvedTaskSchema = UiSchema | UiSchemaV2 | HydratedUiSchemaV2 | null;

/**
 * Resolve a task's snapshot schema and, when the schema has `system_fact_key`
 * bindings, expand them into one item per assigned creator / platform using
 * the response's `hydration_context`. Stale targets (values whose UID is no
 * longer assigned) surface as items flagged `binding_stale: true` so the
 * form can render them dimmed and read-only.
 *
 * `effectiveContent` is what the form is actually carrying — pass the merged
 * `(task.content ∪ draft)` keyset so stale keys from an IndexedDB draft (e.g.
 * a creator unassigned after the draft was last saved) are still recognized
 * as stale instead of being rejected as unknown by the strict validator.
 *
 * Falls back to the plain (non-hydrated) schema when there are no bindings.
 */
export function resolveHydratedTaskSchema(
  task: Pick<TaskWithRelationsDto, 'snapshot' | 'content' | 'hydration_context'>,
  effectiveContent?: Record<string, unknown>,
): ResolvedTaskSchema {
  const resolved = task.snapshot?.schema ? resolveUiSchema(task.snapshot.schema) : null;
  if (!resolved) {
    return null;
  }
  if (getSchemaEngine(resolved) !== 'task_template_v2') {
    return resolved;
  }
  const v2 = resolved as UiSchemaV2;
  const hasBindings = v2.items.some((item) => Boolean(item.system_fact_key));
  if (!hasBindings) {
    return v2;
  }
  const persistedContent = (task.content as Record<string, unknown> | null) ?? {};
  const content = effectiveContent
    ? { ...persistedContent, ...effectiveContent }
    : persistedContent;
  return hydrateTaskFormSchema(
    v2,
    task.hydration_context ?? { creators: [], platforms: [] },
    content,
  );
}

/**
 * Drop any content keys that aren't recognized by the given schema.
 *
 * Used when loading IndexedDB drafts: a draft written by a different
 * version of the hydration code (or by a broken intermediate state) may
 * carry keys that no longer match either an active target, a stale
 * target, or a reason/extra sidecar. Strict-mode validation rejects them,
 * leaving the form unsubmittable AND unable to clear the draft (which
 * only happens on successful submit). This prunes those orphans so the
 * user can keep going.
 *
 * Returns `{ pruned, dropped }` where `pruned` is the filtered map and
 * `dropped` is the list of keys that were removed.
 */
export function pruneContentAgainstSchema(
  content: Record<string, unknown>,
  schema: UiSchema | UiSchemaV2 | null,
): { pruned: Record<string, unknown>; dropped: string[] } {
  if (!schema) {
    return { pruned: content, dropped: [] };
  }
  const valid = new Set<string>();
  for (const item of schema.items) {
    const key = getFieldContentKey(schema, item);
    valid.add(key);
    valid.add(getTaskContentReasonKey(key));
    valid.add(getTaskContentExtraKey(key));
  }
  const pruned: Record<string, unknown> = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(content)) {
    if (valid.has(key)) {
      pruned[key] = value;
    } else {
      dropped.push(key);
    }
  }
  return { pruned, dropped };
}
