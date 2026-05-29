import { z } from 'zod';

import { UID_PREFIXES } from '../constants.js';

/**
 * Audit action codes recorded by the extraction pipeline and manager overrides.
 * `SKIPPED_LOWER_PRIORITY` records an extraction attempt that lost the priority
 * resolver compare; the input is preserved in `task.content` for review.
 */
export const auditActionSchema = z.enum([
  'CREATE',
  'UPDATE',
  'DELETE',
  'OVERRIDE',
  'SKIPPED_LOWER_PRIORITY',
  'SIGN_OFF',
]);

/**
 * Polymorphic discriminator on `AuditTarget`. Matches the typed FK that the
 * junction row sets on creation.
 */
export const auditTargetTypeSchema = z.enum([
  'SHOW',
  'SHOW_CREATOR',
  'SHOW_PLATFORM',
  'STUDIO_SHIFT',
]);

/**
 * Source priority tiers consumed by the extraction pipeline. The `CREATOR_INPUT`
 * slot has no Phase 4 writer; reserved for forward compatibility.
 */
export const actualsSourceSchema = z.enum([
  'MANAGER',
  'PLATFORM',
  'CREATOR_INPUT',
  'OPERATOR',
  'PLANNED',
]);

/**
 * Origin tag for engine-written audits. Manager overrides set the request actor
 * directly and omit this key.
 */
export const auditIngestionSourceSchema = z.enum([
  'task_submission',
  'platform_telemetry',
  'manager_override',
]);

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

/**
 * Loosely-shaped metadata bag. Engine writes populate `ingestion_source`,
 * `task_uid`, `task_field_id`, `old_value`, and `new_value`. Skipped writes
 * populate `skipped_by_source`. Extra keys are permitted so downstream
 * extractors can attach context without a contract change.
 *
 * Note: `reason` is a first-class column on the `audits` row, not a metadata
 * key. The merger in PR 12 still tolerates a legacy `reason` key here when
 * back-filling pre-column rows, but new writers always use the column.
 */
export const auditMetadataSchema = z
  .object({
    ingestion_source: auditIngestionSourceSchema.optional(),
    task_uid: z.string().optional(),
    task_field_id: z.string().optional(),
    fact_key: z.string().optional(),
    old_value: jsonValueSchema.optional(),
    new_value: jsonValueSchema.optional(),
    skipped_by_source: actualsSourceSchema.optional(),
  })
  .catchall(jsonValueSchema);

export const auditTargetApiResponseSchema = z.object({
  target_type: auditTargetTypeSchema,
  target_uid: z.string(),
});

export const auditApiResponseSchema = z.object({
  id: z.string().startsWith(UID_PREFIXES.AUDIT),
  action: auditActionSchema,
  actor_uid: z.string().startsWith(UID_PREFIXES.USER).nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  /**
   * Free-text justification supplied by the actor on OVERRIDE-class writes.
   * Null for engine writes. First-class column, not nested in `metadata`.
   */
  reason: z.string().nullable(),
  metadata: auditMetadataSchema,
  targets: z.array(auditTargetApiResponseSchema),
  created_at: z.iso.datetime(),
});

/**
 * Unified timeline entry that the read-time merger emits. `source: 'audit'`
 * rows come from the `audits` table; `source: 'legacy_snapshot_override'`
 * rows come from the historical `metadata.audit.snapshot_overrides[]` shape
 * embedded on compensation/shift entities.
 *
 * Both shapes project to the same `{ field, old_value, new_value, actor, at }`
 * surface so review UIs render a single list.
 */
export const auditTimelineEntrySchema = z.object({
  source: z.enum(['audit', 'legacy_snapshot_override']),
  action: auditActionSchema,
  field: z.string().nullable(),
  old_value: jsonValueSchema.nullable(),
  new_value: jsonValueSchema.nullable(),
  actor_uid: z.string().nullable(),
  actor_ext_id: z.string().nullable(),
  reason: z.string().nullable(),
  ingestion_source: auditIngestionSourceSchema.nullable(),
  at: z.iso.datetime(),
  audit_uid: z.string().startsWith(UID_PREFIXES.AUDIT).nullable(),
});
