import {
  type AuditAction,
  type AuditIngestionSource,
  auditIngestionSourceSchema,
  type AuditTimelineEntry,
} from '@eridu/api-types/audits';

import type { AuditWithTargets } from './schemas/audit.schema';

/**
 * Read-time merger that unifies the new `Audit` history with the legacy
 * `metadata.audit.snapshot_overrides[]` sidecar shape carried on existing
 * compensation / shift / show entities.
 *
 * Design reference: `TASK_INPUT_FACT_BINDING_DESIGN.md` §3.C — "the
 * compensation-snapshot override pattern is migrated by a sidecar reader: PR 12
 * ships a read-time merger that returns both legacy and new audit rows as one
 * history". The eventual back-fill into the `audits` table is tracked
 * separately and may land post-Phase 4.
 *
 * Both sources project to {@link AuditTimelineEntry} so downstream review UIs
 * render a single chronological list.
 */

type LegacySnapshotOverride = {
  field?: unknown;
  old_value?: unknown;
  new_value?: unknown;
  actor_ext_id?: unknown;
  at?: unknown;
  reason?: unknown;
};

/**
 * Reads `metadata.audit.snapshot_overrides[]` from a single entity's metadata
 * blob and projects each entry into the unified timeline shape.
 *
 * Returns an empty array when the metadata is missing, malformed, or carries
 * no `audit.snapshot_overrides[]` key.
 */
export function legacyMetadataToTimeline(
  metadata: unknown,
): AuditTimelineEntry[] {
  const overrides = readLegacyOverrides(metadata);
  if (overrides.length === 0) {
    return [];
  }

  const entries: AuditTimelineEntry[] = [];
  for (const raw of overrides) {
    const at = normalizeLegacyTimestamp(raw.at);
    if (!at) {
      continue;
    }
    entries.push({
      source: 'legacy_snapshot_override',
      action: 'OVERRIDE',
      field: typeof raw.field === 'string' ? raw.field : null,
      old_value: normalizeValue(raw.old_value),
      new_value: normalizeValue(raw.new_value),
      actor_uid: null,
      actor_ext_id:
        typeof raw.actor_ext_id === 'string' ? raw.actor_ext_id : null,
      reason: typeof raw.reason === 'string' ? raw.reason : null,
      ingestion_source: null,
      at,
      audit_uid: null,
    });
  }
  return entries;
}

/**
 * Projects a single `Audit` row (with its `AuditTarget` join rows already
 * loaded) into the unified timeline shape. Engine writes carry their context
 * inside `metadata`; the projector pulls `field`/`old_value`/`new_value` from
 * there so the timeline shape stays consistent across sources.
 *
 * `actorUidMap` lets the caller hand in a pre-resolved `actorId → uid` map
 * (typically loaded in one bulk `User.findMany` alongside the audit query).
 * When the map is omitted, `actor_uid` is `null`; callers that need it should
 * always pass the map.
 */
export function auditToTimelineEntry(
  audit: AuditWithTargets,
  actorUidMap?: ReadonlyMap<bigint, string>,
): AuditTimelineEntry {
  const metadata = (audit.metadata ?? {}) as Record<string, unknown>;
  // Reason precedence: first-class column wins; metadata.reason is a legacy
  // fallback for any pre-column rows that may have been written before this
  // PR landed. New writers always populate the column.
  const reason = audit.reason
    ?? (typeof metadata.reason === 'string' ? metadata.reason : null);
  return {
    source: 'audit',
    action: audit.action as AuditAction,
    field: typeof metadata.fact_key === 'string'
      ? metadata.fact_key
      : typeof metadata.task_field_id === 'string'
        ? metadata.task_field_id
        : null,
    old_value: normalizeValue(metadata.old_value),
    new_value: normalizeValue(metadata.new_value),
    actor_uid: audit.actorId != null
      ? (actorUidMap?.get(audit.actorId) ?? null)
      : null,
    actor_ext_id: null,
    reason,
    ingestion_source: parseIngestionSource(metadata.ingestion_source),
    at: audit.createdAt.toISOString(),
    audit_uid: audit.uid,
  };
}

/**
 * Merges legacy sidecar entries with new audit-table entries into one timeline,
 * sorted newest first. Ties on `at` preserve the input order (legacy first,
 * then new audits) so back-fills don't shuffle the visible order.
 */
export function mergeAuditTimeline(
  legacy: AuditTimelineEntry[],
  newAudits: AuditTimelineEntry[],
): AuditTimelineEntry[] {
  return [...legacy, ...newAudits].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );
}

function readLegacyOverrides(metadata: unknown): LegacySnapshotOverride[] {
  if (!isPlainObject(metadata)) {
    return [];
  }
  const audit = metadata.audit;
  if (!isPlainObject(audit)) {
    return [];
  }
  const overrides = audit.snapshot_overrides;
  return Array.isArray(overrides)
    ? overrides.filter(isPlainObject)
    : [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeValue(value: unknown): AuditTimelineEntry['old_value'] {
  if (value === undefined) {
    return null;
  }
  // Already-stored JSON values pass through; AuditTimelineEntry's value slots
  // accept any JSON-serializable shape.
  return value as AuditTimelineEntry['old_value'];
}

/**
 * Validates and normalizes a legacy `at` timestamp into a strict ISO string.
 * Returns `null` for non-string or non-parseable inputs so the caller can skip
 * the row instead of emitting an entry that would fail `auditTimelineEntrySchema`
 * downstream or sort to `NaN` in `mergeAuditTimeline`. Normalization adds
 * milliseconds when the source omits them; the represented instant is preserved.
 */
function normalizeLegacyTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    return null;
  }
  return new Date(ms).toISOString();
}

/**
 * Runtime-validates an `ingestion_source` value against the closed enum so
 * unexpected strings (back-fills, manually written rows) don't propagate as
 * fake enum members. Returns `null` on any mismatch.
 */
function parseIngestionSource(value: unknown): AuditIngestionSource | null {
  const parsed = auditIngestionSourceSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
