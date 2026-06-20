import type { z } from 'zod';

/**
 * Redacts a parsed object down to an explicit allow-list of field names.
 * Any key present on `schema.shape` that is NOT in `allowedKeys` is forced to
 * `null` — including fields added to the schema after this call site was
 * written. This is deliberately the inverse of a blacklist: a forgotten
 * update to `allowedKeys` redacts a new field by default instead of leaking
 * it. Only call this on schemas where every non-allow-listed field is
 * nullable (Finance Guardrails S3 — money fields are `.nullable()` by
 * convention); a non-nullable field left off the allow-list will fail the
 * caller's subsequent `.parse()`.
 */
export function projectAllowList<Shape extends z.ZodRawShape, T extends Record<string, unknown>>(
  schema: z.ZodObject<Shape>,
  item: T,
  allowedKeys: ReadonlySet<string>,
): T {
  const result = { ...item };
  for (const key of Object.keys(schema.shape)) {
    if (!allowedKeys.has(key)) {
      (result as Record<string, unknown>)[key] = null;
    }
  }
  return result;
}

/**
 * Drops the legacy `audit` sidecar (`metadata.audit.snapshot_overrides[]`,
 * see `legacy-snapshot-merger.ts`) from a metadata blob. Use this alongside
 * `projectAllowList` when `metadata` itself stays allow-listed (e.g. because
 * the field isn't `.nullable()` and can't be forced to `null`) but the
 * record can carry an audit trail of historical money values — the override
 * entries themselves are not a fixed field name `projectAllowList` can
 * allow-list against.
 */
export function stripLegacyAuditSidecar<T extends Record<string, unknown>>(metadata: T): T;
export function stripLegacyAuditSidecar<T extends Record<string, unknown>>(
  metadata: T | null | undefined,
): T | null | undefined;
export function stripLegacyAuditSidecar<T extends Record<string, unknown>>(
  metadata: T | null | undefined,
): T | null | undefined {
  if (!metadata || typeof metadata !== 'object' || !('audit' in metadata)) {
    return metadata;
  }
  const { audit: _audit, ...rest } = metadata;
  return rest as T;
}
