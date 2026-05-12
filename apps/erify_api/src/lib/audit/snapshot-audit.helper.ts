import { Prisma } from '@prisma/client';

import { HttpError } from '@/lib/errors/http-error.util';

export type SnapshotChange = {
  field: string;
  old_value: unknown;
  new_value: unknown;
};

/**
 * Appends snapshot audit entries to the metadata object.
 * Each changed field results in a separate entry in metadata.audit.snapshot_overrides[].
 *
 * Throws if a reason is supplied but no fields actually changed — silently dropping
 * the reason would leave the audit log incorrectly empty.
 *
 * @param metadata Existing metadata object
 * @param changes List of field changes to audit
 * @param actorExtId External ID of the user performing the change
 * @param reason Optional reason for the override
 */
export function appendSnapshotAudit(
  metadata: unknown,
  changes: SnapshotChange[],
  actorExtId: string,
  reason?: string,
): Record<string, any> {
  if (changes.length === 0) {
    if (reason) {
      throw HttpError.badRequest(
        'override_reason was provided but no snapshot fields changed',
      );
    }
    return toMetadataObject(metadata);
  }

  const at = new Date().toISOString();
  const newEntries = changes.map((c) => ({
    field: c.field,
    old_value: formatValue(c.old_value),
    new_value: formatValue(c.new_value),
    actor_ext_id: actorExtId,
    at,
    ...(reason ? { reason } : {}),
  }));

  const currentMetadata = toMetadataObject(metadata);
  const currentAudit = toMetadataObject(currentMetadata.audit);
  const currentOverrides = Array.isArray(currentAudit.snapshot_overrides)
    ? currentAudit.snapshot_overrides
    : [];

  return {
    ...currentMetadata,
    audit: {
      ...currentAudit,
      snapshot_overrides: [...currentOverrides, ...newEntries],
    },
  };
}

/**
 * Compares two values for equality, handling Prisma.Decimal.
 */
export function isSnapshotValueEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  // Handle null/undefined comparison
  if (a == null || b == null) {
    return a === b;
  }

  // Handle Prisma.Decimal
  if (a instanceof Prisma.Decimal || b instanceof Prisma.Decimal) {
    try {
      const decA = a instanceof Prisma.Decimal ? a : new Prisma.Decimal(a as Prisma.Decimal.Value);
      const decB = b instanceof Prisma.Decimal ? b : new Prisma.Decimal(b as Prisma.Decimal.Value);
      return decA.equals(decB);
    } catch {
      return false;
    }
  }

  // Handle Date
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  return false;
}

function toMetadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function formatValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Prisma.Decimal) {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  return value;
}
